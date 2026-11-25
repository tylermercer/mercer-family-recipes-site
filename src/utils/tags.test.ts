import { describe, it, expect } from 'vitest';
import { countTags, normalizeTag, tagPath, tagSlug, uniqueTags } from '@utils/tags';

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

describe('countTags', () => {
  it('counts recipes per tag, most-used first, alphabetical within a tie', () => {
    expect(
      countTags([['dinner', 'gf'], ['dessert'], ['dinner'], ['gf', 'dessert'], ['breakfast']]),
    ).toEqual([
      { tag: 'dessert', count: 2 },
      { tag: 'dinner', count: 2 },
      { tag: 'gf', count: 2 },
      { tag: 'breakfast', count: 1 },
    ]);
  });

  it('treats tags with the same slug as one tag and counts a recipe once per tag', () => {
    expect(countTags([['Main Dishes', 'main-dishes'], ['main dishes']])).toEqual([
      { tag: 'main dishes', count: 2 },
    ]);
  });

  it('ignores empty tags and handles no recipes', () => {
    expect(countTags([['', '!!!']])).toEqual([]);
    expect(countTags([])).toEqual([]);
  });
});
