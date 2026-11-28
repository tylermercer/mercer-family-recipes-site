import { describe, expect, it } from 'vitest';
import {
	cacheStrategyFor,
	pageCacheKeys,
	pageTitleFromDocumentTitle,
	type RoutableRequest,
} from '@utils/serviceWorkerRouting';

const ORIGIN = 'https://familyrecipes.tylermercer.net';

function req(overrides: Partial<RoutableRequest> = {}): RoutableRequest {
	return {
		url: `${ORIGIN}/`,
		method: 'GET',
		mode: 'no-cors',
		cache: 'default',
		destination: '',
		accept: '*/*',
		...overrides,
	};
}

describe('cacheStrategyFor', () => {
	it('treats navigations as pages', () => {
		expect(cacheStrategyFor(req({ url: `${ORIGIN}/blueberry-pie`, mode: 'navigate', destination: 'document' }), ORIGIN)).toBe('page');
	});

	it('treats requests that accept HTML as pages', () => {
		expect(cacheStrategyFor(req({ accept: 'text/html,application/xhtml+xml' }), ORIGIN)).toBe('page');
	});

	it('caches hashed build output first', () => {
		expect(cacheStrategyFor(req({ url: `${ORIGIN}/_astro/NavBar.C_klmZwd.css`, destination: 'style' }), ORIGIN)).toBe('immutable');
		expect(cacheStrategyFor(req({ url: `${ORIGIN}/_astro/figtree.D_ZTVpCC.woff2`, destination: 'font' }), ORIGIN)).toBe('immutable');
	});

	it('goes network first for unhashed files like Pagefind and the favicon', () => {
		expect(cacheStrategyFor(req({ url: `${ORIGIN}/pagefind/pagefind-component-ui.js`, destination: 'script' }), ORIGIN)).toBe('network-first');
		expect(cacheStrategyFor(req({ url: `${ORIGIN}/pagefind/pagefind-entry.json` }), ORIGIN)).toBe('network-first');
		expect(cacheStrategyFor(req({ url: `${ORIGIN}/favicon.svg`, destination: 'image', accept: 'image/svg+xml,image/*' }), ORIGIN)).toBe('network-first');
	});

	it('ignores non-GET requests', () => {
		expect(cacheStrategyFor(req({ method: 'POST', mode: 'navigate' }), ORIGIN)).toBeNull();
		expect(cacheStrategyFor(req({ method: 'HEAD' }), ORIGIN)).toBeNull();
	});

	it('ignores cross-origin requests', () => {
		expect(cacheStrategyFor(req({ url: 'https://docs.google.com/document/d/x', mode: 'navigate' }), ORIGIN)).toBeNull();
		expect(cacheStrategyFor(req({ url: 'https://lh3.googleusercontent.com/a.png', destination: 'image' }), ORIGIN)).toBeNull();
	});

	it('ignores only-if-cached requests outside same-origin mode', () => {
		expect(cacheStrategyFor(req({ cache: 'only-if-cached', mode: 'no-cors' }), ORIGIN)).toBeNull();
		expect(cacheStrategyFor(req({ cache: 'only-if-cached', mode: 'same-origin', url: `${ORIGIN}/favicon.svg` }), ORIGIN)).toBe('network-first');
	});

	it('never handles the worker script', () => {
		expect(cacheStrategyFor(req({ url: `${ORIGIN}/sw.js`, destination: 'script' }), ORIGIN)).toBeNull();
	});
});

describe('pageCacheKeys', () => {
	it('adds the trailing-slash form for extensionless paths', () => {
		expect(pageCacheKeys(`${ORIGIN}/blueberry-pie`)).toEqual([`${ORIGIN}/blueberry-pie`, `${ORIGIN}/blueberry-pie/`]);
	});

	it('leaves paths that already end in a slash alone', () => {
		expect(pageCacheKeys(`${ORIGIN}/`)).toEqual([`${ORIGIN}/`]);
		expect(pageCacheKeys(`${ORIGIN}/tags/dessert/`)).toEqual([`${ORIGIN}/tags/dessert/`]);
	});

	it('does not add a slash to file paths', () => {
		expect(pageCacheKeys(`${ORIGIN}/404.html`)).toEqual([`${ORIGIN}/404.html`]);
	});

	it('drops the query string and hash', () => {
		expect(pageCacheKeys(`${ORIGIN}/blueberry-pie?utm_source=slack#ingredients`)).toEqual([
			`${ORIGIN}/blueberry-pie`,
			`${ORIGIN}/blueberry-pie/`,
		]);
	});
});

describe('pageTitleFromDocumentTitle', () => {
	it('strips the site name suffix', () => {
		expect(pageTitleFromDocumentTitle('Blueberry Pie · Family Recipes')).toBe('Blueberry Pie');
	});

	it('leaves the bare site name (the homepage) as is', () => {
		expect(pageTitleFromDocumentTitle('Family Recipes')).toBe('Family Recipes');
	});

	it('trims whitespace', () => {
		expect(pageTitleFromDocumentTitle('  Chia Pudding · Family Recipes \n')).toBe('Chia Pudding');
	});

	it('handles an empty title', () => {
		expect(pageTitleFromDocumentTitle('')).toBe('');
	});
});
