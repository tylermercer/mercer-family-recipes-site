import { describe, it, expect, vi } from 'vitest';
import { CONFIRM_VIBRATION_MS, confirmHaptic } from '@utils/haptics';

describe('confirmHaptic', () => {
	it('vibrates briefly where the Vibration API exists', () => {
		const vibrate = vi.fn(() => true);
		expect(confirmHaptic({ vibrate })).toBe(true);
		expect(vibrate).toHaveBeenCalledWith(CONFIRM_VIBRATION_MS);
	});

	it('reports when the browser declines to vibrate (e.g. no user gesture yet)', () => {
		expect(confirmHaptic({ vibrate: vi.fn(() => false) })).toBe(false);
	});

	it('does nothing without the Vibration API, as on iOS', () => {
		expect(confirmHaptic({})).toBe(false);
	});

	it('does nothing without a navigator', () => {
		expect(confirmHaptic(undefined)).toBe(false);
	});

	it('swallows errors from vibrate', () => {
		const vibrate = vi.fn(() => {
			throw new Error('blocked');
		});
		expect(confirmHaptic({ vibrate })).toBe(false);
	});

	it('keeps the vibration short', () => {
		expect(CONFIRM_VIBRATION_MS).toBeLessThanOrEqual(20);
	});
});
