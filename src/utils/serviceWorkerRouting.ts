/**
 * Pure routing decisions for the service worker (src/service-worker.ts), kept here so they can be
 * unit tested without a worker environment.
 */

/**
 * Cache Storage names. Bump the version suffix to throw away every cache on the next worker
 * activation (the worker deletes any cache not named here). The offline page reads PAGES.
 */
export const CACHE_NAMES = {
	/** The offline page, the homepage, and all /_astro/ build output, fetched at install. */
	PRECACHE: 'precache-v1',
	PAGES: 'pages-v1',
	ASSETS: 'assets-v1',
	/** Bookkeeping: which version of each page is saved (see SAVED_PAGES_KEY). */
	META: 'meta-v1',
} as const;

/**
 * Key in CACHE_NAMES.META whose body is a JSON SavedPages object: for each page the worker saved
 * in the background, the content hash of the version it saved.
 */
export const SAVED_PAGES_KEY = '/__saved-pages__';

/** Page path ("/pumpkin-cookies/") to a hash of its HTML. */
export type PageHashes = Record<string, string>;

export type CacheStrategy =
	/** HTML pages: network first, falling back to the cached copy, then the offline page. */
	| 'page'
	/** Content-hashed build output under /_astro/: cache first, since a URL's bytes never change. */
	| 'immutable'
	/** Everything else same-origin (Pagefind, favicon, og-image): network first, cache as fallback. */
	| 'network-first';

/** The parts of a Request that routing looks at. */
export interface RoutableRequest {
	url: string;
	method: string;
	mode: RequestMode;
	cache: RequestCache;
	destination: RequestDestination;
	accept: string;
}

/**
 * Which strategy the worker should use for a request, or null to let the browser handle it
 * untouched (non-GET, cross-origin, and the dev-only only-if-cached quirk).
 */
export function cacheStrategyFor(request: RoutableRequest, origin: string): CacheStrategy | null {
	if (request.method !== 'GET') return null;
	// Chrome DevTools can issue these; fetching them from a worker throws.
	if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return null;

	const url = new URL(request.url);
	if (url.origin !== origin) return null;
	// The worker script itself is fetched by the browser's update check, never through fetch events,
	// but guard anyway so a stale copy can't pin an old worker.
	if (url.pathname === '/sw.js') return null;

	if (request.mode === 'navigate' || request.destination === 'document' || request.accept.includes('text/html')) {
		return 'page';
	}
	if (url.pathname.startsWith('/_astro/')) return 'immutable';
	return 'network-first';
}

/**
 * Cache keys to try, in order, for a page request when the network is down. Recipe links point at
 * `/slug`, but the server answers that with a redirect to `/slug/`, so only `/slug/` ever gets cached.
 * The query string and hash are dropped since no page varies by them.
 */
export function pageCacheKeys(requestUrl: string): string[] {
	const url = new URL(requestUrl);
	url.search = '';
	url.hash = '';
	const keys = [url.href];
	if (!url.pathname.endsWith('/') && !/\.[a-z0-9]+$/i.test(url.pathname)) {
		url.pathname += '/';
		keys.push(url.href);
	}
	return keys;
}

/** Strips the " · Family Recipes" suffix Base.astro adds, for listing cached pages by name. */
export function pageTitleFromDocumentTitle(documentTitle: string, siteName = 'Family Recipes'): string {
	const title = documentTitle.trim();
	const suffix = ` · ${siteName}`;
	return title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
}

/**
 * The paths the worker saves for offline use, from the pathnames Astro reports at the end of a
 * build ("", "slug/", "tags/dinner/"): every built page as the browser ends up requesting it, with a
 * leading and trailing slash. The 404 page is left out, and duplicates are dropped.
 */
export function pagePathsFromBuild(pathnames: string[]): string[] {
	const paths = new Set<string>();
	for (const pathname of pathnames) {
		const trimmed = pathname.replace(/^\/+|\/+$/g, '');
		if (trimmed === '404') continue;
		paths.add(trimmed === '' ? '/' : `/${trimmed}/`);
	}
	return [...paths].sort();
}

/**
 * Saved page URLs that aren't pages of the current build any more (a deleted or renamed recipe),
 * so the worker can drop them instead of offering them offline forever.
 */
export function stalePageUrls(cachedUrls: string[], pagePaths: string[]): string[] {
	const current = new Set(pagePaths);
	return cachedUrls.filter((url) => !current.has(new URL(url).pathname));
}

/** Reads the saved-pages record, treating a missing or unreadable one as nothing saved. */
export function parseSavedPages(json: string | null | undefined): PageHashes {
	if (!json) return {};
	try {
		const parsed: unknown = JSON.parse(json);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
		const pages: PageHashes = {};
		for (const [path, hash] of Object.entries(parsed)) {
			if (typeof hash === 'string') pages[path] = hash;
		}
		return pages;
	} catch {
		return {};
	}
}

/**
 * The pages the worker needs to (re)download: ones whose built hash differs from the version it
 * saved, ones it never saved, and ones whose saved copy is gone from the cache. Unchanged pages are
 * skipped, so adding a recipe downloads only the pages that list it, not the whole site.
 */
export function pagesToSave(built: PageHashes, saved: PageHashes, cachedPaths: ReadonlySet<string>): string[] {
	return Object.keys(built)
		.filter((path) => saved[path] !== built[path] || !cachedPaths.has(path))
		.sort();
}
