import { describe, it, expect, vi } from 'vitest';
import { SESSION_ENTRY_KEY, getSessionStorage, normalizePath, recordSessionEntry, shouldNavigateBack } from '@utils/sessionEntry';

function memoryStorage(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));
	return {
		getItem: vi.fn((key: string) => data.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => void data.set(key, value)),
	};
}

function throwingStorage() {
	return {
		getItem: vi.fn(() => {
			throw new Error('blocked');
		}),
		setItem: vi.fn(() => {
			throw new Error('blocked');
		}),
	};
}

describe('normalizePath', () => {
	it('drops trailing slashes', () => {
		expect(normalizePath('/pumpkin-cookies/')).toBe('/pumpkin-cookies');
		expect(normalizePath('/tags/dinner//')).toBe('/tags/dinner');
	});

	it('keeps the root as /', () => {
		expect(normalizePath('/')).toBe('/');
		expect(normalizePath('')).toBe('/');
	});

	it('leaves paths without a trailing slash alone', () => {
		expect(normalizePath('/pumpkin-cookies')).toBe('/pumpkin-cookies');
	});
});

describe('recordSessionEntry', () => {
	it('stores the first page of the session', () => {
		const storage = memoryStorage();
		recordSessionEntry(storage, '/pumpkin-cookies/');
		expect(storage.getItem(SESSION_ENTRY_KEY)).toBe('/pumpkin-cookies');
	});

	it('keeps the first page when later pages are recorded', () => {
		const storage = memoryStorage();
		recordSessionEntry(storage, '/');
		recordSessionEntry(storage, '/pumpkin-cookies/');
		expect(storage.getItem(SESSION_ENTRY_KEY)).toBe('/');
		expect(storage.setItem).toHaveBeenCalledTimes(1);
	});

	it('does nothing without storage', () => {
		expect(() => recordSessionEntry(null, '/')).not.toThrow();
		expect(() => recordSessionEntry(undefined, '/')).not.toThrow();
	});

	it('swallows storage errors', () => {
		expect(() => recordSessionEntry(throwingStorage(), '/')).not.toThrow();
	});
});

describe('shouldNavigateBack', () => {
	it('goes back when the session started on another page', () => {
		const storage = memoryStorage({ [SESSION_ENTRY_KEY]: '/' });
		expect(shouldNavigateBack(storage, '/pumpkin-cookies/', 3)).toBe(true);
	});

	it('follows the link on the session entry page', () => {
		const storage = memoryStorage({ [SESSION_ENTRY_KEY]: '/pumpkin-cookies' });
		expect(shouldNavigateBack(storage, '/pumpkin-cookies/', 3)).toBe(false);
	});

	it('treats /slug and /slug/ as the same page', () => {
		const storage = memoryStorage({ [SESSION_ENTRY_KEY]: '/pumpkin-cookies' });
		expect(shouldNavigateBack(storage, '/pumpkin-cookies', 2)).toBe(false);
	});

	it('follows the link when the tab has no history to go back to', () => {
		const storage = memoryStorage({ [SESSION_ENTRY_KEY]: '/' });
		expect(shouldNavigateBack(storage, '/pumpkin-cookies/', 1)).toBe(false);
	});

	it('follows the link when no entry was recorded', () => {
		expect(shouldNavigateBack(memoryStorage(), '/pumpkin-cookies/', 3)).toBe(false);
	});

	it('follows the link without storage or when storage throws', () => {
		expect(shouldNavigateBack(null, '/pumpkin-cookies/', 3)).toBe(false);
		expect(shouldNavigateBack(throwingStorage(), '/pumpkin-cookies/', 3)).toBe(false);
	});
});

describe('getSessionStorage', () => {
	it('returns null when there is no window', () => {
		expect(getSessionStorage()).toBeNull();
	});
});
