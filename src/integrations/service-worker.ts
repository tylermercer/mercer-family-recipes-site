import type { AstroIntegration } from 'astro';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readdir } from 'node:fs/promises';

/**
 * Bundles the service worker (TypeScript, may import from src/) to /sw.js after each build. The
 * worker precaches the homepage, the offline page, and every file Astro wrote to /_astro/, so the
 * list is filled in here once the build output exists. Adapted from InnerHelm's integration.
 *
 * There's no dev-server route: Base.astro only registers the worker in production, since in dev
 * it would cache Vite's bundles and serve stale copies.
 */
export default function serviceWorkerIntegration(options: { src: string }): AstroIntegration {
	let root: URL;

	return {
		name: 'service-worker',
		hooks: {
			'astro:config:setup': ({ config }) => {
				root = config.root;
			},
			'astro:build:done': async ({ dir, logger }) => {
				const outDir = fileURLToPath(dir);

				let astroFiles: string[] = [];
				try {
					astroFiles = (await readdir(join(outDir, '_astro'))).map((file) => `/_astro/${file}`);
				} catch {
					logger.warn('No _astro directory found; the service worker will precache pages only.');
				}
				const precacheUrls = ['/', '/offline/', ...astroFiles];

				await build({
					entryPoints: [fileURLToPath(new URL(options.src, root))],
					outfile: join(outDir, 'sw.js'),
					bundle: true,
					minify: true,
					format: 'iife',
					platform: 'browser',
					target: 'es2022',
					logLevel: 'error',
					tsconfig: fileURLToPath(new URL('./tsconfig.json', root)),
					define: {
						__PRECACHE_URLS__: JSON.stringify(precacheUrls),
					},
				});
				logger.info(`Service worker written to sw.js, precaching ${precacheUrls.length} URLs.`);
			},
		},
	};
}
