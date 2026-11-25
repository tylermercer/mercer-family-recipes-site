// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { syncThemeColorMeta } from '@utils/syncThemeColorMeta';

const LIGHT = '#FFFDF7';
const DARK = '#14110C';

function metas() {
  const [light, dark] = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  return { light: light.content, dark: dark.content };
}

describe('syncThemeColorMeta', () => {
  beforeEach(() => {
    document.head.innerHTML = `
      <meta name="theme-color" content="${LIGHT}" media="(prefers-color-scheme: light)"
        data-scheme="light" data-theme-color-light="${LIGHT}" data-theme-color-dark="${DARK}">
      <meta name="theme-color" content="${DARK}" media="(prefers-color-scheme: dark)"
        data-scheme="dark" data-theme-color-light="${LIGHT}" data-theme-color-dark="${DARK}">
      <meta name="theme-color" content="#123456">`;
  });

  it('points both tags at the dark color when dark is pinned', () => {
    syncThemeColorMeta('dark');
    expect(metas()).toEqual({ light: DARK, dark: DARK });
  });

  it('points both tags at the light color when light is pinned', () => {
    syncThemeColorMeta('light');
    expect(metas()).toEqual({ light: LIGHT, dark: LIGHT });
  });

  it('restores each tag to its own scheme when following the system', () => {
    syncThemeColorMeta('dark');
    syncThemeColorMeta(null);
    expect(metas()).toEqual({ light: LIGHT, dark: DARK });
  });

  it('leaves theme-color tags without data attributes alone', () => {
    syncThemeColorMeta('dark');
    const other = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')[2];
    expect(other.content).toBe('#123456');
  });
});
