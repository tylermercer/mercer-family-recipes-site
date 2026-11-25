import { describe, it, expect } from 'vitest';
import { nextThemeOverride, type Theme } from '@utils/nextThemeOverride';

describe('nextThemeOverride', () => {
  // Rows from the behavior table in the personal website's dark-mode-toggle spec.
  it.each<[Theme | null, Theme, Theme | null]>([
    [null, 'light', 'dark'],
    [null, 'dark', 'light'],
    ['light', 'light', 'dark'],
    ['light', 'dark', null],
    ['dark', 'dark', 'light'],
    ['dark', 'light', null],
  ])('stored=%s, system=%s -> %s', (stored, system, expected) => {
    expect(nextThemeOverride(stored, system)).toBe(expected);
  });

  it('alternates between pinning and following the system when the system is unchanged', () => {
    let stored: Theme | null = null;
    stored = nextThemeOverride(stored, 'light');
    expect(stored).toBe('dark');
    stored = nextThemeOverride(stored, 'light');
    expect(stored).toBeNull();
    stored = nextThemeOverride(stored, 'light');
    expect(stored).toBe('dark');
  });

  it('always changes the displayed theme on click', () => {
    for (const stored of [null, 'light', 'dark'] as const) {
      for (const system of ['light', 'dark'] as const) {
        const before = stored ?? system;
        const after = nextThemeOverride(stored, system) ?? system;
        expect(after).not.toBe(before);
      }
    }
  });
});
