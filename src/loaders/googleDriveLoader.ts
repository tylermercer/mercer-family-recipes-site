import type { Loader } from 'astro/loaders';
import { google } from 'googleapis';

export interface GoogleDriveLoaderOptions {
  folderId: string;
  serviceAccountEmail: string;
  privateKey: string;
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

      // Initialize Google Auth using Service Account
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });

      const drive = google.drive({ version: 'v3', auth });

      try {
        store.clear();

        const foldersToProcess: string[] = [folderId];
        let totalDocsFound = 0;

        while (foldersToProcess.length > 0) {
          const currentFolderId = foldersToProcess.shift()!;

          // 1. Query subfolders inside currentFolderId
          let folderPageToken: string | undefined = undefined;
          do {
            const folderResponse: any = await drive.files.list({
              q: `'${currentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
              fields: 'nextPageToken, files(id, name)',
              pageToken: folderPageToken,
            });

            const subfolders = folderResponse.data.files || [];
            for (const subfolder of subfolders) {
              if (subfolder.id) {
                foldersToProcess.push(subfolder.id);
              }
            }
            folderPageToken = folderResponse.data.nextPageToken || undefined;
          } while (folderPageToken);

          // 2. Query Google Docs inside currentFolderId
          let docPageToken: string | undefined = undefined;
          do {
            const docResponse: any = await drive.files.list({
              q: `'${currentFolderId}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`,
              fields: 'nextPageToken, files(id, name, modifiedTime, webViewLink)',
              pageToken: docPageToken,
            });

            const files = docResponse.data.files || [];
            totalDocsFound += files.length;

            for (const file of files) {
              if (!file.id || !file.name) continue;

              // Export Google Doc content as HTML
              const exportResponse = await drive.files.export({
                fileId: file.id,
                mimeType: 'text/markdown',
              });

              const renderedContent = await renderMarkdown(exportResponse.data as string);

              // Generate a safe slug/ID from the file name
              const id = file.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');

              // Raw data object matching collection schema
              const rawData = {
                title: file.name,
                lastModified: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
                driveUrl: file.webViewLink || `https://docs.google.com/document/d/${file.id}/edit`,
              };

              // Parse and validate via Astro's data pipeline
              const parsedData = await parseData({
                id,
                data: rawData,
              });

              // Store entry along with rendered content
              store.set({
                id,
                data: parsedData,
                rendered: renderedContent,
              });
            }

            docPageToken = docResponse.data.nextPageToken || undefined;
          } while (docPageToken);
        }

        if (totalDocsFound === 0) {
          logger.warn('No Google Docs found in the specified folder or its subfolders.');
        } else {
          logger.info(`Google Docs (${totalDocsFound}) successfully loaded into Content Layer!`);
        }
      } catch (error) {
        logger.error(`Failed to load Google Docs: ${error instanceof Error ? error.message : error}`);
      }
    },
  };
}
