import { describe, expect, it } from 'vitest';
import {
	cacheStrategyFor,
	pageCacheKeys,
	pagePathsFromBuild,
	pagesToSave,
	pageTitleFromDocumentTitle,
	parseSavedPages,
	stalePageUrls,
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

describe('pagePathsFromBuild', () => {
	it('turns Astro pathnames into slash-wrapped paths', () => {
		expect(pagePathsFromBuild(['', 'pumpkin-cookies/', 'tags/dinner/', 'offline/'])).toEqual([
			'/',
			'/offline/',
			'/pumpkin-cookies/',
			'/tags/dinner/',
		]);
	});

	it('adds a missing trailing slash and drops duplicates', () => {
		expect(pagePathsFromBuild(['pumpkin-cookies', '/pumpkin-cookies/'])).toEqual(['/pumpkin-cookies/']);
	});

	it('leaves out the 404 page', () => {
		expect(pagePathsFromBuild(['404', '404/', ''])).toEqual(['/']);
	});

	it('returns nothing for no pages', () => {
		expect(pagePathsFromBuild([])).toEqual([]);
	});
});

describe('stalePageUrls', () => {
	const pages = ['/', '/offline/', '/pumpkin-cookies/'];

	it('keeps pages that are still built', () => {
		expect(stalePageUrls([`${ORIGIN}/`, `${ORIGIN}/pumpkin-cookies/`], pages)).toEqual([]);
	});

	it('returns pages that no longer exist', () => {
		expect(stalePageUrls([`${ORIGIN}/pumpkin-cookies/`, `${ORIGIN}/deleted-recipe/`], pages)).toEqual([
			`${ORIGIN}/deleted-recipe/`,
		]);
	});

	it('returns entries saved under a slashless path, since the slashed one replaces them', () => {
		expect(stalePageUrls([`${ORIGIN}/pumpkin-cookies`], pages)).toEqual([`${ORIGIN}/pumpkin-cookies`]);
	});

	it('ignores the query string when matching', () => {
		expect(stalePageUrls([`${ORIGIN}/pumpkin-cookies/?scale=2`], pages)).toEqual([]);
	});
});

describe('parseSavedPages', () => {
	it('reads a saved-pages record', () => {
		expect(parseSavedPages('{"/":"aaa","/pumpkin-cookies/":"bbb"}')).toEqual({ '/': 'aaa', '/pumpkin-cookies/': 'bbb' });
	});

	it('treats a missing record as nothing saved', () => {
		expect(parseSavedPages(null)).toEqual({});
		expect(parseSavedPages(undefined)).toEqual({});
		expect(parseSavedPages('')).toEqual({});
	});

	it('treats unreadable JSON or the wrong shape as nothing saved', () => {
		expect(parseSavedPages('{not json')).toEqual({});
		expect(parseSavedPages('["/"]')).toEqual({});
		expect(parseSavedPages('null')).toEqual({});
		expect(parseSavedPages('"x"')).toEqual({});
	});

	it('drops entries whose hash is not a string', () => {
		expect(parseSavedPages('{"/":"aaa","/x/":3,"/y/":null}')).toEqual({ '/': 'aaa' });
	});
});

describe('pagesToSave', () => {
	const built = { '/': 'h1', '/pumpkin-cookies/': 'p1', '/tags/dinner/': 't1' };
	const allCached = new Set(Object.keys(built));

	it('downloads everything the first time', () => {
		expect(pagesToSave(built, {}, new Set())).toEqual(['/', '/pumpkin-cookies/', '/tags/dinner/']);
	});

	it('downloads nothing when every saved page is current', () => {
		expect(pagesToSave(built, { ...built }, allCached)).toEqual([]);
	});

	it('downloads only the pages that changed or are new', () => {
		const next = { ...built, '/': 'h2', '/new-recipe/': 'n1' };
		expect(pagesToSave(next, built, allCached)).toEqual(['/', '/new-recipe/']);
	});

	it('downloads a page whose saved copy is gone from the cache', () => {
		const cached = new Set(['/', '/tags/dinner/']);
		expect(pagesToSave(built, built, cached)).toEqual(['/pumpkin-cookies/']);
	});

	it('ignores saved pages that are no longer built', () => {
		expect(pagesToSave(built, { ...built, '/deleted/': 'd1' }, allCached)).toEqual([]);
	});
});
