import { describe, it, expect } from 'vitest';
import { normalizeTag, tagPath, tagSlug, uniqueTags } from '@utils/tags';

describe('normalizeTag', () => {
  it.each([
    ['Desserts', 'desserts'],
    ['Main_Dishes', 'main dishes'],
    ['main-dishes', 'main dishes'],
    ['  Slow   Cooker ', 'slow cooker'],
    ['', ''],
  ])('normalizes %j to %j', (raw, expected) => {
    expect(normalizeTag(raw)).toBe(expected);
  });
});

describe('tagSlug / tagPath', () => {
  it('slugifies tags', () => {
    expect(tagSlug('main dishes')).toBe('main-dishes');
    expect(tagSlug('Soups & Stews')).toBe('soups-and-stews');
    expect(tagSlug('GF')).toBe('gf');
  });

  it('builds the tag page path', () => {
    expect(tagPath('Main Dishes')).toBe('/tags/main-dishes');
  });
});

describe('uniqueTags', () => {
  it('normalizes and dedupes, keeping first-seen order', () => {
    expect(uniqueTags(['Desserts', 'gf', 'desserts', 'Main_Dishes', 'main-dishes'])).toEqual([
      'desserts',
      'gf',
      'main dishes',
    ]);
  });

  it('drops tags with no usable characters', () => {
    expect(uniqueTags(['', '  ', '---', '!!!'])).toEqual([]);
  });
});
