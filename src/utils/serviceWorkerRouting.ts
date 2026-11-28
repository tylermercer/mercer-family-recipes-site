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
} as const;

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
