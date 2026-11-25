import { describe, it, expect } from 'vitest';
import { contributorPath, contributorSlug } from '@utils/contributorSlug';

describe('contributorSlug', () => {
  it.each([
    ['Mom & Dad', 'mom-and-dad'],
    ['Dan & Leanna', 'dan-and-leanna'],
    ['Eve & Tyler', 'eve-and-tyler'],
    ['EJ & Liza', 'ej-and-liza'],
    ['Russell', 'russell'],
  ])('slugifies %s', (name, slug) => {
    expect(contributorSlug(name)).toBe(slug);
  });

  it('handles & without surrounding spaces and stray punctuation', () => {
    expect(contributorSlug('Eve&Tyler')).toBe('eve-and-tyler');
    expect(contributorSlug('  Mom & Dad! ')).toBe('mom-and-dad');
  });

  it('returns an empty string for empty input', () => {
    expect(contributorSlug('')).toBe('');
  });
});

describe('contributorPath', () => {
  it('builds the family page path', () => {
    expect(contributorPath('Eve & Tyler')).toBe('/family/eve-and-tyler');
  });
});
