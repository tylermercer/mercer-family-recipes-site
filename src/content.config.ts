import { defineCollection, z } from 'astro:content';
import { googleDriveLoader } from './loaders/googleDriveLoader';

const recipes = defineCollection({
  loader: googleDriveLoader({
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY,
  }),
  schema: z.object({
    title: z.string(),
    lastModified: z.date(),
  }),
});

export const collections = {
  recipes,
};
