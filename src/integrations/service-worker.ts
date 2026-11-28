import type { AstroIntegration } from 'astro';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pagePathsFromBuild, type PageHashes } from '../utils/serviceWorkerRouting';

/**
 * Bundles the service worker (TypeScript, may import from src/) to /sw.js after each build. The
 * worker precaches the homepage, the offline page, and every file Astro wrote to /_astro/, so the
 * list is filled in here once the build output exists. It also gets every built page's path with a
 * hash of its HTML; it saves the pages in the background so the whole cookbook opens offline, and
 * on later deploys downloads only the pages whose hash changed.
 * Adapted from InnerHelm's integration.
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
			'astro:build:done': async ({ dir, pages, logger }) => {
				const outDir = fileURLToPath(dir);

				let astroFiles: string[] = [];
				try {
					astroFiles = (await readdir(join(outDir, '_astro'))).map((file) => `/_astro/${file}`);
				} catch {
					logger.warn('No _astro directory found; the service worker will precache pages only.');
				}
				const precacheUrls = ['/', '/offline/', ...astroFiles];

				const pageHashes: PageHashes = {};
				for (const path of pagePathsFromBuild(pages.map((page) => page.pathname))) {
					try {
						const html = await readFile(join(outDir, path, 'index.html'));
						pageHashes[path] = createHash('sha256').update(html).digest('hex').slice(0, 12);
					} catch {
						// Not written as path/index.html (e.g. an on-demand route), so not something to save.
					}
				}
				const pageCount = Object.keys(pageHashes).length;

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
						__PAGE_HASHES__: JSON.stringify(pageHashes),
					},
				});
				logger.info(
					`Service worker written to sw.js, precaching ${precacheUrls.length} URLs and saving ${pageCount} pages.`,
				);
			},
		},
	};
}
