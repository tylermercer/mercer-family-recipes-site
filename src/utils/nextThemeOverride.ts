export type Theme = 'light' | 'dark';

/**
 * Decides what a click on the two-state theme toggle does. Internally there are three states
 * (a stored `light` or `dark` override, or `null` to follow the system preference), but the
 * toggle only ever displays light or dark.
 *
 * - If the displayed theme matches the system preference at click time, pin the opposite theme.
 * - Otherwise (an override diverges from the system), clear it and follow the system again.
 *
 * Returns the override to store, or `null` to remove it.
 */
export function nextThemeOverride(stored: Theme | null, systemTheme: Theme): Theme | null {
  const displayed = stored ?? systemTheme;
  if (displayed === systemTheme) {
    return systemTheme === 'dark' ? 'light' : 'dark';
  }
  return null;
}
