import { describe, it, expect } from 'vitest';
import { extractHashtags } from './extractHashtags';

describe('extractHashtags', () => {
  it('finds hashtags anywhere in the body, in order, deduplicated', () => {
    expect(extractHashtags('Great for #dessert.\n\n#GF #slow-cooker #dessert')).toEqual([
      'dessert',
      'GF',
      'slow-cooker',
    ]);
  });

  it('finds escaped hashtags at the start of a line', () => {
    expect(extractHashtags('\\#dessert \\#gf')).toEqual(['dessert', 'gf']);
  });

  it('handles underscores, digits, unicode letters and trailing punctuation', () => {
    expect(extractHashtags('#main_dish, #air-fryer2! #crème-brûlée-')).toEqual([
      'main_dish',
      'air-fryer2',
      'crème-brûlée',
    ]);
  });

  it('ignores headings, URL fragments, entities, numbers and mid-word #', () => {
    const md = [
      '# Heading',
      '## Subheading',
      '[link](https://docs.google.com/document/d/abc/edit#heading=h.123)',
      'https://example.com/page#section',
      'Use pan #2 and &#39;quotes&#39;',
      'C#sharp and ##double',
    ].join('\n');
    expect(extractHashtags(md)).toEqual([]);
  });

  it('ignores escaped URL fragments, as exported by Google Docs', () => {
    const md = [
      'Based on: [https://www.example.com/pancakes/\\#wprm-recipe-container-6578](https://www.example.com/pancakes/\\#wprm-recipe-container-6578)',
      'Source: https://www.example.com/recipe-254152\\#post-recipe-12479',
      '<https://example.com/a\\#frag> www.example.com/b\\#frag2',
      'word\\#notatag',
    ].join('\n');
    expect(extractHashtags(md)).toEqual([]);
  });

  it('still finds hashtags next to links', () => {
    expect(extractHashtags('[Source](https://example.com/#frag) #dessert')).toEqual(['dessert']);
  });

  it('ignores hashtags in code spans and fenced code blocks', () => {
    expect(extractHashtags('`#notatag`\n\n```\n#alsonot\n```\n\n#real')).toEqual(['real']);
  });

  it('returns an empty array for empty input', () => {
    expect(extractHashtags('')).toEqual([]);
  });
});
