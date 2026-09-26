import { defineCollection } from 'astro:content';
import { z } from "astro/zod";
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
    driveUrl: z.string().optional(),
  }),
});

export const collections = {
  recipes,
};
