/**
 * Remembers the first page opened in a tab's session (in sessionStorage), so a recipe's back
 * button can tell whether there's a page of ours to go back to. Base.astro records it on every
 * page; only the first call in a session sticks.
 */

export const SESSION_ENTRY_KEY = 'session-entry-path';

type SessionStore = Pick<Storage, 'getItem' | 'setItem'>;

/** window.sessionStorage, or null where reading it throws (storage blocked) or there's no window. */
export function getSessionStorage(): Storage | null {
	try {
		return typeof window === 'undefined' ? null : window.sessionStorage;
	} catch {
		return null;
	}
}

/** `/slug` and `/slug/` are the same page (the server redirects one to the other). */
export function normalizePath(path: string): string {
	const trimmed = path.replace(/\/+$/, '');
	return trimmed === '' ? '/' : trimmed;
}

/** Stores `path` as the session's entry page, unless one is already stored. */
export function recordSessionEntry(storage: SessionStore | null | undefined, path: string): void {
	if (!storage) return;
	try {
		if (storage.getItem(SESSION_ENTRY_KEY) === null) {
			storage.setItem(SESSION_ENTRY_KEY, normalizePath(path));
		}
	} catch {
		// Storage can be blocked or full; the back button then just acts as a link.
	}
}

/**
 * Whether the back button should go back in history rather than follow its link: true only when
 * the session started on some other page and this tab has a page to go back to. A tab opened with
 * "Open in new tab" copies sessionStorage but starts with a history of one, hence the length check.
 */
export function shouldNavigateBack(
	storage: SessionStore | null | undefined,
	path: string,
	historyLength: number,
): boolean {
	if (!storage || historyLength <= 1) return false;
	let entry: string | null;
	try {
		entry = storage.getItem(SESSION_ENTRY_KEY);
	} catch {
		return false;
	}
	return entry !== null && entry !== normalizePath(path);
}
