import type { Loader } from 'astro/loaders';
import { google, type drive_v3 } from 'googleapis';
import mammoth from 'mammoth';
import TurndownService from 'turndown';

export interface GoogleDriveLoaderOptions {
  folderId: string;
  serviceAccountEmail: string;
  privateKey: string;
}

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

      // Write-scoped client lazily initialized ONLY to convert legacy .doc files
      // into temporary Google Docs (which are exported and deleted).
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
        const wd = getWriteDrive();
        const copy = await wd.files.copy({
          fileId,
          requestBody: { name: `tmp-convert-${name}`, mimeType: MIME.gdoc },
          fields: 'id',
        });
        const tempId = copy.data.id;
        if (!tempId) {
          throw new Error('Drive did not return an ID for the converted copy.');
        }
        try {
          return await exportGoogleDocAsMarkdown(wd, tempId);
        } finally {
          await wd.files.delete({ fileId: tempId }).catch((e) =>
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

      try {
        store.clear();

        const foldersToProcess: string[] = [folderId];
        const seenIds = new Set<string>();
        let totalDocsFound = 0;
        let totalLoaded = 0;

        while (foldersToProcess.length > 0) {
          const currentFolderId = foldersToProcess.shift()!;

          // 1. Subfolders
          const subfolders = await listAll(
            `'${currentFolderId}' in parents and mimeType = '${MIME.folder}' and trashed = false`,
            'id, name',
          );
          for (const sf of subfolders) {
            if (sf.id) {
              foldersToProcess.push(sf.id);
            }
          }

          // 2. Google Docs + .docx + .doc
          const files = await listAll(
            `'${currentFolderId}' in parents and trashed = false and (` +
              `mimeType = '${MIME.gdoc}' or mimeType = '${MIME.docx}' or mimeType = '${MIME.doc}')`,
            'id, name, mimeType, modifiedTime, webViewLink',
          );
          totalDocsFound += files.length;

          for (const file of files) {
            if (!file.id || !file.name) continue;

            try {
              let markdown: string;
              switch (file.mimeType) {
                case MIME.gdoc:
                  markdown = await exportGoogleDocAsMarkdown(drive, file.id);
                  break;
                case MIME.docx:
                  markdown = await docxToMarkdown(file.id);
                  break;
                case MIME.doc:
                  markdown = await docToMarkdown(file.id, file.name);
                  break;
                default:
                  continue;
              }

              const renderedContent = await renderMarkdown(markdown);

              const title = file.name.replace(/\.docx?$/i, '') || file.name;
              let id = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');

              if (!id || seenIds.has(id)) {
                id = `${id ? id + '-' : ''}${file.id.slice(0, 8)}`;
              }
              seenIds.add(id);

              const rawData = {
                title,
                lastModified: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
                driveUrl:
                  file.webViewLink ||
                  (file.mimeType === MIME.gdoc
                    ? `https://docs.google.com/document/d/${file.id}/edit`
                    : `https://drive.google.com/file/d/${file.id}/view`),
              };

              const parsedData = await parseData({ id, data: rawData });

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
