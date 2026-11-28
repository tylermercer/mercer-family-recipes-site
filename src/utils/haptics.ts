/**
 * A short vibration to confirm an action, like a native app's haptic tick. Used sparingly (the
 * native-feel guide's advice): only to confirm something was saved. Works on Android browsers;
 * iOS has no Vibration API, so there it's silently skipped.
 */

/** Long enough to feel, short enough to read as a tick rather than a buzz. */
export const CONFIRM_VIBRATION_MS = 12;

type Vibrator = { vibrate?: (pattern: number | number[]) => boolean };

/** Vibrates briefly where supported. Returns whether a vibration was started. */
export function confirmHaptic(nav: Vibrator | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
	if (!nav || typeof nav.vibrate !== 'function') return false;
	try {
		return nav.vibrate(CONFIRM_VIBRATION_MS);
	} catch {
		return false;
	}
}
