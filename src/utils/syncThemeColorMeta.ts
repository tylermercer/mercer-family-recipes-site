import type { Theme } from './nextThemeOverride';

/**
 * Keeps the `<meta name="theme-color">` tags in step with the theme override. Each tag carries
 * its theme's color in `data-theme-color-light` / `data-theme-color-dark` plus a
 * prefers-color-scheme `media` query, which only follows the system setting. When an override
 * is pinned, both tags take the override's color so the browser chrome matches the page;
 * with no override, each tag goes back to its own theme's color.
 *
 * The inline script in Base.astro repeats this logic for first paint; keep the two in sync.
 */
export function syncThemeColorMeta(theme: Theme | null, doc: Document = document): void {
  for (const meta of doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][data-scheme]')) {
    const scheme = meta.dataset.scheme as Theme;
    const color = meta.getAttribute(`data-theme-color-${theme ?? scheme}`);
    if (color) meta.content = color;
  }
}
