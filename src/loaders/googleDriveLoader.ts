import type { Loader } from 'astro/loaders';
import { google, type drive_v3 } from 'googleapis';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { rewriteDriveLinks, type LinkedDoc } from './rewriteDriveLinks';
import { stripLeadingH1 } from './stripLeadingH1';
import { stripStrikethrough } from './stripStrikethrough';
import { extractHashtags } from './extractHashtags';
import type { Contributor } from '@utils/contributors';
import { uniqueTags } from '@utils/tags';

export interface GoogleDriveLoaderOptions {
  folderId: string;
  serviceAccountEmail: string;
  privateKey: string;
}

const DEFAULT_CONTRIBUTOR: Contributor = 'Mom & Dad';

/** Maps first-level Drive folder names to contributors. Docs in the root folder are Mom & Dad's. */
export const CONTRIBUTOR_BY_FOLDER: Record<string, Contributor> = {
  'Leanna/Dan recipes': 'Dan & Leanna',
  'Eve&Tyler': 'Eve & Tyler',
};

/**
 * Returns the contributor for a doc given the first-level folder it's under (undefined for the
 * root folder). Unmapped folders fall back to Mom & Dad.
 */
export function contributorForFolder(topLevelFolder: string | undefined): Contributor {
  if (topLevelFolder === undefined) return DEFAULT_CONTRIBUTOR;
  return CONTRIBUTOR_BY_FOLDER[topLevelFolder] ?? DEFAULT_CONTRIBUTOR;
}

/**
 * Tags from the folders a doc is in: every folder below the root, except a first-level folder
 * that maps to a contributor.
 */
export function folderTags(folderPath: string[]): string[] {
  const [first, ...rest] = folderPath;
  if (first === undefined) return [];
  return first in CONTRIBUTOR_BY_FOLDER ? rest : folderPath;
}

/** A doc's Drive file plus the names of the folders it's in, from just below the root down. */
type DriveDoc = drive_v3.Schema$File & { id: string; name: string; folderPath: string[] };

const MIME = {
  folder: 'application/vnd.google-apps.folder',
  gdoc: 'application/vnd.google-apps.document',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
} as const;

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

export function processDocIngredients(text: string): string {
  if (!text || !text.trim()) return text;

  const paragraphs = text.split(/\r?\n\s*\r?\n/);

  const processedParagraphs = paragraphs.map((paragraph) => {
    const lines = paragraph.split(/\r?\n/);
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

    if (nonEmptyLines.length === 0) {
      return paragraph;
    }

    const numberedCount = nonEmptyLines.filter((line) => {
      const cleaned = line.trim().replace(/^[•\-\*]\s*/, '');
      return /^[\d\u00BC-\u00BE\u2150-\u215E]/.test(cleaned);
    }).length;

    const isIngredientsParagraph = numberedCount / nonEmptyLines.length > 0.5;

    if (!isIngredientsParagraph) {
      return paragraph;
    }

    return lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        const cleaned = trimmed.replace(/^[•\-\*]\s*/, '');
        return `- [ ] ${cleaned}`;
      })
      .join('\n');
  });

  return processedParagraphs.join('\n\n');
}

export function googleDriveLoader(options: GoogleDriveLoaderOptions): Loader {
  const folderId = options.folderId;
  const clientEmail = options.serviceAccountEmail;
  const rawPrivateKey = options.privateKey;
  const privateKey = rawPrivateKey?.replace(/\\n/g, '\n');

  return {
    name: 'google-drive-loader',
    load: async ({ store, logger, parseData, renderMarkdown }) => {
      if (!folderId) {
        logger.error('Google Drive Folder ID is missing.');
        return;
      }

      if (!clientEmail || !privateKey) {
        logger.error('Google Service Account credentials (email or private key) are missing.');
        return;
      }

      logger.info('Connecting to Google Drive...');

      const credentials = {
        client_email: clientEmail,
        private_key: privateKey,
      };

      // Read-only client for listing, exporting, and downloading.
      const drive = google.drive({
        version: 'v3',
        auth: new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        }),
      });

      // Write-scoped client lazily initialized ONLY as a fallback to convert legacy .doc files
      // into temporary Google Docs if word-extractor fails.
      let writeDrive: drive_v3.Drive | undefined;
      const getWriteDrive = () =>
        (writeDrive ??= google.drive({
          version: 'v3',
          auth: new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive'],
          }),
        }));

      const exportGoogleDocAsMarkdown = async (client: drive_v3.Drive, fileId: string) => {
        const res = await client.files.export({
          fileId,
          mimeType: 'text/markdown',
        });
        return res.data as unknown as string;
      };

      const docxToMarkdown = async (fileId: string) => {
        const res = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'arraybuffer' },
        );
        const buffer = Buffer.from(res.data as ArrayBuffer);
        const { value: html, messages } = await mammoth.convertToHtml({ buffer });
        for (const m of messages) {
          logger.debug(`mammoth (${fileId}): ${m.message}`);
        }
        return turndown.turndown(html);
      };

      const docToMarkdown = async (fileId: string, name: string) => {
        try {
          const res = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'arraybuffer' },
          );
          const buffer = Buffer.from(res.data as ArrayBuffer);
          const WordExtractor = (await import('word-extractor')).default;
          const extractor = new WordExtractor();
          const extracted = await extractor.extract(buffer);
          const text = extracted.getBody();
          if (text && text.trim().length > 0) {
            return processDocIngredients(text);
          }
        } catch (err) {
          logger.debug(
            `word-extractor failed for "${name}" (${fileId}): ${err instanceof Error ? err.message : err}`,
          );
        }

        // Fallback to Drive API copy-convert if word-extractor is unable to parse
        const wd = getWriteDrive();
        const copy = await wd.files.copy({
          fileId,
          requestBody: {
            name: `tmp-convert-${name}`,
            mimeType: MIME.gdoc,
            parents: [folderId],
          },
          fields: 'id',
          supportsAllDrives: true,
        });
        const tempId = copy.data.id;
        if (!tempId) {
          throw new Error('Drive did not return an ID for the converted copy.');
        }
        try {
          return await exportGoogleDocAsMarkdown(wd, tempId);
        } finally {
          await wd.files.delete({ fileId: tempId, supportsAllDrives: true }).catch((e) =>
            logger.warn(`Could not delete temp conversion file ${tempId}: ${e?.message ?? e}`),
          );
        }
      };

      const listAll = async (q: string, fields: string) => {
        const results: drive_v3.Schema$File[] = [];
        let pageToken: string | undefined;
        do {
          const res: any = await drive.files.list({
            q,
            fields: `nextPageToken, files(${fields})`,
            pageToken,
            pageSize: 100,
          });
          results.push(...(res.data.files ?? []));
          pageToken = res.data.nextPageToken || undefined;
        } while (pageToken);
        return results;
      };

      const convertToMarkdown = async (file: DriveDoc) => {
        switch (file.mimeType) {
          case MIME.gdoc:
            return exportGoogleDocAsMarkdown(drive, file.id);
          case MIME.docx:
            return docxToMarkdown(file.id);
          case MIME.doc:
            return docToMarkdown(file.id, file.name);
          default:
            return undefined;
        }
      };

      try {
        store.clear();

        // Pass 1: walk the folder tree and collect every supported document.
        // folderPath holds the folder names from just below the root down to this folder.
        const foldersToProcess: { id: string; folderPath: string[] }[] = [
          { id: folderId, folderPath: [] },
        ];
        const allFiles: DriveDoc[] = [];
        const docsPerTopLevelFolder = new Map<string, number>();

        while (foldersToProcess.length > 0) {
          const { id: currentFolderId, folderPath } = foldersToProcess.shift()!;

          const subfolders = await listAll(
            `'${currentFolderId}' in parents and mimeType = '${MIME.folder}' and trashed = false`,
            'id, name',
          );
          for (const sf of subfolders) {
            if (sf.id) {
              foldersToProcess.push({ id: sf.id, folderPath: [...folderPath, sf.name ?? ''] });
            }
          }

          const files = await listAll(
            `'${currentFolderId}' in parents and trashed = false and (` +
              `mimeType = '${MIME.gdoc}' or mimeType = '${MIME.docx}' or mimeType = '${MIME.doc}')`,
            'id, name, mimeType, modifiedTime, webViewLink',
          );
          for (const file of files) {
            if (file.id && file.name) {
              allFiles.push({ ...file, id: file.id, name: file.name, folderPath });
              const key = folderPath[0] ?? '(root)';
              docsPerTopLevelFolder.set(key, (docsPerTopLevelFolder.get(key) ?? 0) + 1);
            }
          }
        }

        for (const [folderName, count] of docsPerTopLevelFolder) {
          const mapped = folderName === '(root)' || folderName in CONTRIBUTOR_BY_FOLDER;
          const contributor = contributorForFolder(folderName === '(root)' ? undefined : folderName);
          logger.info(
            `Folder "${folderName}": ${count} document(s) -> ${contributor}` +
              (mapped ? '' : ' (not a contributor folder, so used as a tag)'),
          );
        }

        const totalDocsFound = allFiles.length;

        // Pass 2: convert each document to markdown and assign its slug. Slugs are assigned only
        // to documents that converted, so links never point at a page that doesn't exist.
        const seenIds = new Set<string>();
        const converted: {
          file: DriveDoc;
          id: string;
          title: string;
          markdown: string;
        }[] = [];
        const docsByFileId = new Map<string, LinkedDoc>();

        for (const file of allFiles) {
          try {
            const markdown = await convertToMarkdown(file);
            if (markdown === undefined) continue;

            const title = file.name.replace(/\.docx?$/i, '') || file.name;
            let id = title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)+/g, '');

            if (!id || seenIds.has(id)) {
              id = `${id ? id + '-' : ''}${file.id.slice(0, 8)}`;
            }
            seenIds.add(id);

            converted.push({ file, id, title, markdown });
            docsByFileId.set(file.id, { id, title });
          } catch (err) {
            logger.error(
              `Failed to load "${file.name}": ${err instanceof Error ? err.message : err}`,
            );
          }
        }

        // Pass 3: rewrite links between recipes into internal links, then render and store.
        let totalLoaded = 0;
        const tagCounts = new Map<string, number>();
        for (const { file, id, title, markdown } of converted) {
          try {
            const { markdown: linkedMarkdown, linkedDocs } = rewriteDriveLinks(
              stripLeadingH1(stripStrikethrough(markdown)),
              docsByFileId,
            );
            const renderedContent = await renderMarkdown(linkedMarkdown);

            const rawData = {
              title,
              lastModified: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
              driveUrl:
                file.webViewLink ||
                (file.mimeType === MIME.gdoc
                  ? `https://docs.google.com/document/d/${file.id}/edit`
                  : `https://drive.google.com/file/d/${file.id}/view`),
              contributor: contributorForFolder(file.folderPath[0]),
              tags: uniqueTags([...folderTags(file.folderPath), ...extractHashtags(markdown)]),
              relatedRecipes: linkedDocs.map((doc) => doc.id).filter((relatedId) => relatedId !== id),
            };

            const parsedData = await parseData({ id, data: rawData });

            for (const tag of rawData.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);

            store.set({
              id,
              data: parsedData,
              rendered: renderedContent,
            });
            totalLoaded++;
          } catch (err) {
            logger.error(
              `Failed to load "${file.name}": ${err instanceof Error ? err.message : err}`,
            );
          }
        }

        if (tagCounts.size > 0) {
          const summary = [...tagCounts]
            .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
            .map(([tag, count]) => `${tag} (${count})`)
            .join(', ');
          logger.info(`Tags: ${summary}`);
        }

        if (totalDocsFound === 0) {
          logger.warn('No documents found in the specified folder or its subfolders.');
        } else {
          logger.info(`${totalLoaded}/${totalDocsFound} documents loaded into Content Layer!`);
        }
      } catch (error) {
        logger.error(`Failed to load documents: ${error instanceof Error ? error.message : error}`);
      }
    },
  };
}
