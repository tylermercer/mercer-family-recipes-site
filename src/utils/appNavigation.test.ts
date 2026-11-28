// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { INSTALLED_APP_QUERY, isInstalledApp, shouldSuppressLinkMenu } from '@utils/appNavigation';

function fakeWindow({ matches = false, standalone }: { matches?: boolean; standalone?: boolean } = {}) {
	const matchMedia = vi.fn(() => ({ matches }));
	return { win: { navigator: { standalone }, matchMedia } as unknown as Window, matchMedia };
}

describe('isInstalledApp', () => {
	it('is true when an installed display mode matches', () => {
		const { win, matchMedia } = fakeWindow({ matches: true });
		expect(isInstalledApp(win)).toBe(true);
		expect(matchMedia).toHaveBeenCalledWith(INSTALLED_APP_QUERY);
	});

	it('is false in a browser tab', () => {
		expect(isInstalledApp(fakeWindow({ matches: false }).win)).toBe(false);
	});

	it('is true on older iOS home-screen apps via navigator.standalone', () => {
		expect(isInstalledApp(fakeWindow({ matches: false, standalone: true }).win)).toBe(true);
	});

	it('is false without a window', () => {
		expect(isInstalledApp(undefined)).toBe(false);
	});

	it('is false when matchMedia is missing', () => {
		expect(isInstalledApp({ navigator: {} } as unknown as Window)).toBe(false);
	});
});

describe('shouldSuppressLinkMenu', () => {
	beforeEach(() => {
		document.body.innerHTML = `
			<a id="back" href="/" role="button"><span id="back-inner">← Back</span></a>
			<a id="chip" class="u-chip" href="/tags/dinner/">#dinner</a>
			<a id="recipe" href="/pumpkin-cookies">Pumpkin cookies</a>
			<span id="wip" class="u-chip">Work in progress</span>
			<p id="text">Plain text</p>`;
	});

	const el = (id: string) => document.getElementById(id);

	it('suppresses the menu on button-styled links in the installed app', () => {
		expect(shouldSuppressLinkMenu(el('back'), true)).toBe(true);
	});

	it('suppresses it when the press lands on an element inside the link', () => {
		expect(shouldSuppressLinkMenu(el('back-inner'), true)).toBe(true);
	});

	it('suppresses the menu on chip links', () => {
		expect(shouldSuppressLinkMenu(el('chip'), true)).toBe(true);
	});

	it('keeps the menu on content links', () => {
		expect(shouldSuppressLinkMenu(el('recipe'), true)).toBe(false);
	});

	it('keeps the menu on chips that are not links, and on plain text', () => {
		expect(shouldSuppressLinkMenu(el('wip'), true)).toBe(false);
		expect(shouldSuppressLinkMenu(el('text'), true)).toBe(false);
	});

	it('keeps the menu everywhere in a browser tab', () => {
		expect(shouldSuppressLinkMenu(el('back'), false)).toBe(false);
		expect(shouldSuppressLinkMenu(el('chip'), false)).toBe(false);
	});

	it('handles a null or non-element target', () => {
		expect(shouldSuppressLinkMenu(null, true)).toBe(false);
		expect(shouldSuppressLinkMenu(document, true)).toBe(false);
	});
});
