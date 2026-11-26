import { describe, it, expect } from 'vitest';
import { ingredientsFromHtml, MAX_DESCRIPTION_LENGTH, recipeDescription } from '@utils/recipeDescription';

const item = (text: string) => `<li class="task-list-item"><input type="checkbox" disabled> ${text}</li>`;
const list = (...items: string[]) => `<ul class="contains-task-list">\n${items.map(item).join('\n')}\n</ul>`;

describe('ingredientsFromHtml', () => {
  it('reads checklist items as plain text, decoding entities', () => {
    expect(ingredientsFromHtml(list('2 cups <strong>flour</strong>', 'Salt &amp; pepper', 'Rock&#x27;s salt'))).toEqual([
      '2 cups flour',
      'Salt & pepper',
      "Rock's salt",
    ]);
  });

  it('leaves out nested notes and plain lists', () => {
    const html = `<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"> 1 onion<ul><li>or a shallot</li></ul></li></ul><ul><li>Step one</li></ul>`;
    expect(ingredientsFromHtml(html)).toEqual(['1 onion']);
  });

  it('returns nothing when there is no checklist', () => {
    expect(ingredientsFromHtml('<p>Just text</p>')).toEqual([]);
  });
});

describe('recipeDescription', () => {
  it('lists every ingredient when they fit', () => {
    expect(recipeDescription('Mom & Dad', list('⅓ c. butter', '⅔ c. cocoa'))).toBe(
      'From Mom & Dad. Ingredients: ⅓ c. butter · ⅔ c. cocoa.',
    );
  });

  it('stops at the length limit and says there is more', () => {
    const items = Array.from({ length: 20 }, (_, i) => `${i + 1} cups ingredient number ${i + 1}`);
    const description = recipeDescription('Eve & Tyler', list(...items));
    expect(description.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
    expect(description).toMatch(/^From Eve & Tyler\. Ingredients: 1 cups ingredient number 1 · .* · and more\.$/);
  });

  it('cuts a single very long ingredient short', () => {
    const description = recipeDescription('Mom & Dad', list('x'.repeat(300)));
    expect(description.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
    expect(description.endsWith('…')).toBe(true);
  });

  it('falls back to a generic line without a checklist', () => {
    expect(recipeDescription('Dan & Leanna', '<p>Butter, garlic.</p>')).toBe(
      'From Dan & Leanna. A recipe from the Mercer family cookbook.',
    );
  });
});
