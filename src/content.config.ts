import { defineCollection, reference } from 'astro:content';
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
    /** Recipes linked from this recipe's body, in order of first appearance. */
    relatedRecipes: z.array(reference('recipes')).default([]),
  }),
});

export const collections = {
  recipes,
};
