import { defineCollection, z } from 'astro:content';
import { googleDriveLoader } from './loaders/googleDriveLoader';

const recipes = defineCollection({
  loader: googleDriveLoader({
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
  }),
  schema: z.object({
    title: z.string(),
    lastModified: z.date(),
  }),
});

export const collections = {
  recipes,
};
