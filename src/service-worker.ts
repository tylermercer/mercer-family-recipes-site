/// <reference lib="webworker" />
// Bundled to /sw.js by src/integrations/service-worker.ts after each build, and registered by
// Base.astro in production only. Recipes stay readable in the kitchen when the connection drops:
// the build output is fetched up front so cached pages render with their styles, fonts, and
// scripts, and every page of the site is then saved in the background (see cacheAllPages), so a
// recipe opens offline even if it's never been opened on this device.

import {
	ALL_PAGES_MARKER,
	CACHE_NAMES,
	cacheStrategyFor,
	pageCacheKeys,
	stalePageUrls,
} from '@utils/serviceWorkerRouting';

export type {};
declare const self: ServiceWorkerGlobalScope;
/** Filled in at build time: the homepage, the offline page, and every file under /_astro/. */
declare const __PRECACHE_URLS__: string[];
/** Filled in at build time: every built page's path, e.g. "/", "/pumpkin-cookies/", "/tags/dinner/". */
declare const __PAGE_PATHS__: string[];
/** Filled in at build time: a hash of every built page, which changes when any page does. */
declare const __BUILD_ID__: string;

/** How many pages to fetch at once while saving them all. */
const SAVE_CONCURRENCY = 4;

const OFFLINE_URL = '/offline/';

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAMES.PRECACHE);
			// Fresh from the network, so a new worker never precaches a stale page from the HTTP cache.
			await cache.addAll(__PRECACHE_URLS__.map((url) => new Request(url, { cache: 'reload' })));
		})(),
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const current = new Set<string>(Object.values(CACHE_NAMES));
			const names = await caches.keys();
			await Promise.all(names.filter((name) => !current.has(name)).map((name) => caches.delete(name)));
			await self.clients.claim();
		})(),
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const strategy = cacheStrategyFor(
		{
			url: request.url,
			method: request.method,
			mode: request.mode,
			cache: request.cache,
			destination: request.destination,
			accept: request.headers.get('Accept') ?? '',
		},
		self.location.origin,
	);

	if (strategy === 'page') event.respondWith(networkFirstPage(event));
	else if (strategy === 'immutable') event.respondWith(cacheFirst(event));
	else if (strategy === 'network-first') event.respondWith(networkFirst(event));
});

// Pages ask for the full save on each load (Base.astro). It's a message rather than part of install
// or activate, since waiting on ~100 fetches there would hold up the worker taking over, and a
// message event keeps the worker alive until the save finishes.
let savingAllPages: Promise<void> | null = null;

self.addEventListener('message', (event) => {
	if (event.data?.type !== 'CACHE_ALL_PAGES') return;
	savingAllPages ??= cacheAllPages().finally(() => {
		savingAllPages = null;
	});
	event.waitUntil(savingAllPages);
});

/**
 * Saves every page of this build into the pages cache, fresh from the network, and drops saved
 * pages that no longer exist. Pages are still network-first, so this only matters offline. Skipped
 * once a build's pages are all saved; a page that fails leaves the marker unset, so the next page
 * load tries again.
 */
async function cacheAllPages(): Promise<void> {
	const meta = await caches.open(CACHE_NAMES.META);
	if ((await (await meta.match(ALL_PAGES_MARKER))?.text()) === __BUILD_ID__) return;

	const cache = await caches.open(CACHE_NAMES.PAGES);
	const queue = [...__PAGE_PATHS__];
	let failed = false;
	const worker = async () => {
		for (let path = queue.shift(); path !== undefined; path = queue.shift()) {
			try {
				// no-cache: revalidate with the server, so the HTTP cache can't hand back an old copy.
				const response = await fetch(new Request(path, { cache: 'no-cache' }));
				if (response.ok && !response.redirected) await cache.put(path, response);
				else failed = true;
			} catch {
				failed = true;
			}
		}
	};
	await Promise.all(Array.from({ length: SAVE_CONCURRENCY }, worker));

	const cachedUrls = (await cache.keys()).map((request) => request.url);
	await Promise.all(stalePageUrls(cachedUrls, __PAGE_PATHS__).map((url) => cache.delete(url)));

	if (!failed) await meta.put(ALL_PAGES_MARKER, new Response(__BUILD_ID__));
}

function putInCache(event: FetchEvent, cacheName: string, response: Response): void {
	const copy = response.clone();
	event.waitUntil(caches.open(cacheName).then((cache) => cache.put(event.request, copy)));
}

async function networkFirstPage(event: FetchEvent): Promise<Response> {
	try {
		const response = await fetch(event.request);
		// Redirects (/slug -> /slug/) come back opaque and aren't ok, so only the final page is kept.
		if (response.ok) putInCache(event, CACHE_NAMES.PAGES, response);
		return response;
	} catch {
		for (const key of pageCacheKeys(event.request.url)) {
			const cached = await caches.match(key);
			if (cached) return cached;
		}
		const offline = await caches.match(OFFLINE_URL);
		if (offline) return offline;
		return new Response('You’re offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
	}
}

async function cacheFirst(event: FetchEvent): Promise<Response> {
	const cached = await caches.match(event.request);
	if (cached) return cached;
	try {
		const response = await fetch(event.request);
		if (response.ok) putInCache(event, CACHE_NAMES.ASSETS, response);
		return response;
	} catch {
		return Response.error();
	}
}

async function networkFirst(event: FetchEvent): Promise<Response> {
	try {
		const response = await fetch(event.request);
		if (response.ok) putInCache(event, CACHE_NAMES.ASSETS, response);
		return response;
	} catch {
		return (await caches.match(event.request)) ?? Response.error();
	}
}
