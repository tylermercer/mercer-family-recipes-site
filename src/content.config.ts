import { defineCollection, reference } from 'astro:content';
import { z } from "astro/zod";
import { googleDriveLoader } from './loaders/googleDriveLoader';
import { CONTRIBUTORS } from '@utils/contributors';

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
    /** Who contributed the recipe, based on the Drive folder it's in. */
    contributor: z.enum(CONTRIBUTORS),
    /** Normalized tags from non-contributor folders and hashtags in the body. */
    tags: z.array(z.string()).default([]),
    /** Recipes linked from this recipe's body, in order of first appearance. */
    relatedRecipes: z.array(reference('recipes')).default([]),
  }),
});

export const collections = {
  recipes,
};
