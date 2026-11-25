// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { ingredientListText } from '@utils/ingredientListText';

function root(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

const item = (text: string) => `<li class="task-list-item"><input type="checkbox" disabled> ${text}</li>`;

describe('ingredientListText', () => {
  it('lists each ingredient on its own line', () => {
    const html = `<p>Intro</p><ul class="contains-task-list">${item('2 cups flour')}${item('1  tsp\n salt')}</ul><p>Mix.</p>`;
    expect(ingredientListText(root(html))).toBe('- 2 cups flour\n- 1 tsp salt');
  });

  it('indents nested notes under their ingredient', () => {
    const html = `<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"> 1 onion<ul><li>or a shallot</li></ul></li>${item('2 eggs')}</ul>`;
    expect(ingredientListText(root(html))).toBe('- 1 onion\n  - or a shallot\n- 2 eggs');
  });

  it('labels each group with its heading when there are several lists', () => {
    const html = `<h2>Crust</h2><ul class="contains-task-list">${item('1 cup flour')}</ul>
      <h2>Filling</h2><ul class="contains-task-list">${item('3 apples')}</ul>`;
    expect(ingredientListText(root(html))).toBe('Crust\n- 1 cup flour\n\nFilling\n- 3 apples');
  });

  it('skips the heading for a single list', () => {
    const html = `<h2>Ingredients</h2><ul class="contains-task-list">${item('1 cup flour')}</ul>`;
    expect(ingredientListText(root(html))).toBe('- 1 cup flour');
  });

  it('does not count a nested task list as its own group', () => {
    const html = `<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox"> Spices<ul class="contains-task-list">${item('1 tsp cumin')}</ul></li></ul>`;
    expect(ingredientListText(root(html))).toBe('- Spices\n  - 1 tsp cumin');
  });

  it('returns an empty string when there are no checklists', () => {
    expect(ingredientListText(root('<ul><li>Step one</li></ul>'))).toBe('');
  });
});
