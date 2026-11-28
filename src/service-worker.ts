/// <reference lib="webworker" />
// Bundled to /sw.js by src/integrations/service-worker.ts after each build, and registered by
// Base.astro in production only. Recipes stay readable in the kitchen when the connection drops:
// every page you open is kept, and the build output is fetched up front so cached pages render
// with their styles, fonts, and scripts.

import { CACHE_NAMES, cacheStrategyFor, pageCacheKeys } from '@utils/serviceWorkerRouting';

export type {};
declare const self: ServiceWorkerGlobalScope;
/** Filled in at build time: the homepage, the offline page, and every file under /_astro/. */
declare const __PRECACHE_URLS__: string[];

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
