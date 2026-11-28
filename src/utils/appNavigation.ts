/**
 * Helpers for behaving like an app when the site runs installed (from the home screen or app
 * drawer) rather than in a browser tab.
 */

/** The display modes a manifest can launch into, other than a normal browser tab. */
export const INSTALLED_APP_QUERY =
	'(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)';

/** Whether the page is running as the installed app. False outside a browser. */
export function isInstalledApp(win: Window | undefined = typeof window === 'undefined' ? undefined : window): boolean {
	if (!win) return false;
	// iOS before 16.4 doesn't match display-mode, but sets navigator.standalone.
	if ((win.navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
	return typeof win.matchMedia === 'function' && win.matchMedia(INSTALLED_APP_QUERY).matches;
}

/**
 * Links that act as the app's own navigation controls (button-styled links such as "← Back", and
 * tag and family chips), as opposed to links in content, such as recipe titles or links in a recipe.
 */
export const APP_NAV_LINK_SELECTOR = 'a[role="button"], a.u-chip';

/**
 * Whether a long press or right-click on `target` should skip the browser's link menu ("Open in new
 * tab", "Copy link address"): only on app navigation links, and only in the installed app. Content
 * links, and everything in a browser tab, keep the menu.
 */
export function shouldSuppressLinkMenu(target: EventTarget | null, installed: boolean): boolean {
	if (!installed) return false;
	if (!target || typeof (target as Element).closest !== 'function') return false;
	return (target as Element).closest(APP_NAV_LINK_SELECTOR) !== null;
}
