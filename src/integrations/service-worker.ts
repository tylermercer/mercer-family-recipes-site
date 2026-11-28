import type { AstroIntegration } from 'astro';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pagePathsFromBuild } from '../utils/serviceWorkerRouting';

/**
 * Bundles the service worker (TypeScript, may import from src/) to /sw.js after each build. The
 * worker precaches the homepage, the offline page, and every file Astro wrote to /_astro/, so the
 * list is filled in here once the build output exists. It also gets every built page's path, which
 * it saves in the background so the whole cookbook opens offline, and a build id: a hash of those
 * pages' HTML, so a deploy that changes a page (and only that) makes the worker save them again.
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

				const pagePaths = pagePathsFromBuild(pages.map((page) => page.pathname));
				const hash = createHash('sha256');
				for (const path of pagePaths) {
					hash.update(path);
					try {
						hash.update(await readFile(join(outDir, path, 'index.html')));
					} catch {
						// Not written as path/index.html (e.g. an on-demand route); its path alone counts.
					}
				}
				const buildId = hash.digest('hex').slice(0, 16);

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
						__PAGE_PATHS__: JSON.stringify(pagePaths),
						__BUILD_ID__: JSON.stringify(buildId),
					},
				});
				logger.info(
					`Service worker written to sw.js, precaching ${precacheUrls.length} URLs and saving ${pagePaths.length} pages (build ${buildId}).`,
				);
			},
		},
	};
}
