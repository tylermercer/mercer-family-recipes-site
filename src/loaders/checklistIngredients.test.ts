import { describe, it, expect } from 'vitest';
import { checklistIngredients } from './checklistIngredients';

const md = (...lines: string[]) => lines.join('\n');

describe('checklistIngredients', () => {
  describe('labeled sections', () => {
    it('checklists a Google Docs bulleted list under an Ingredients heading', () => {
      const input = md(
        '# Pie Crust',
        '',
        '## Ingredients',
        '',
        '* 2 1/2 cups GF flour  ',
        '* 1/2 tsp sea salt  ',
        '* 7 to 8 tbsp ice water',
        '',
        '## Preparation',
        '',
        '1. **Chill the water:** Start chilling the water.  ',
        '2. Pulse the flour.',
      );
      expect(checklistIngredients(input)).toBe(
        md(
          '# Pie Crust',
          '',
          '## Ingredients',
          '',
          '- [ ] 2 1/2 cups GF flour',
          '- [ ] 1/2 tsp sea salt',
          '- [ ] 7 to 8 tbsp ice water',
          '',
          '## Preparation',
          '',
          '1. **Chill the water:** Start chilling the water.  ',
          '2. Pulse the flour.',
        ),
      );
    });

    it('keeps subsection headings and nesting, and leaves the instructions alone', () => {
      const input = md(
        '## ***Ingredients***',
        '### Crust',
        '- Cookies of some sort  ',
        '  - 1 sleeve graham crackers  ',
        '- 1/4 cup butter',
        '### Filling',
        '- 3 eggs',
        '## Instructions',
        '### Make the crust',
        '- Crush the cookies',
      );
      expect(checklistIngredients(input)).toBe(
        md(
          '## ***Ingredients***',
          '### Crust',
          '- [ ] Cookies of some sort',
          '  - [ ] 1 sleeve graham crackers',
          '- [ ] 1/4 cup butter',
          '### Filling',
          '- [ ] 3 eggs',
          '## Instructions',
          '### Make the crust',
          '- Crush the cookies',
        ),
      );
    });

    it('ends a plain "Ingredients:" label section at the next label, keeping notes unchecked', () => {
      const input = md(
        'Equipment',
        '* Mixing bowl',
        'Ingredients:',
        '* Sausage \\- 1 lb  ',
        '* (Optional: serve with bread.)',
        'Topping',
        '* ⅓ cup peanut butter',
        'Instructions:',
        '* Brown the sausage.',
      );
      expect(checklistIngredients(input)).toBe(
        md(
          'Equipment',
          '* Mixing bowl',
          'Ingredients:',
          '- [ ] Sausage \\- 1 lb',
          '- (Optional: serve with bread.)',
          'Topping',
          '- [ ] ⅓ cup peanut butter',
          'Instructions:',
          '* Brown the sausage.',
        ),
      );
    });

    it('checklists plain lines when the section has no bullets, joining wrapped prep fragments', () => {
      const input = md(
        '## Ingredients',
        '2 teaspoons sesame oil  ',
        '5 cloves garlic  ',
        'minced  ',
        'olive oil  ',
        'salt and pepper to taste',
        '## Steps',
        '1. Add everything.',
      );
      expect(checklistIngredients(input)).toBe(
        md(
          '## Ingredients',
          '- [ ] 2 teaspoons sesame oil',
          '- [ ] 5 cloves garlic, minced',
          '- [ ] olive oil',
          '- [ ] salt and pepper to taste',
          '## Steps',
          '1. Add everything.',
        ),
      );
    });

    it('stops a bullet-less section at the first instruction sentence', () => {
      const input = md(
        'Ingredients:',
        '',
        '2 cups flour',
        '1 egg',
        'pinch of cinnamon',
        '',
        'Mix the dry ingredients, then add the egg.',
        'Bake at 350 for 20 mins.',
      );
      expect(checklistIngredients(input)).toBe(
        md(
          'Ingredients:',
          '',
          '- [ ] 2 cups flour',
          '- [ ] 1 egg',
          '- [ ] pinch of cinnamon',
          '',
          'Mix the dry ingredients, then add the egg.',
          'Bake at 350 for 20 mins.',
        ),
      );
    });
  });

  describe('unlabeled runs', () => {
    it('checklists .docx paragraphs of ingredients, skipping the title and tightening the list', () => {
      const input = md(
        'African Peanut Stew',
        '',
        '1 tbsp. olive oil',
        '',
        '½ cup chopped carrot',
        '',
        '1 (14 oz.) can diced tomatoes, drained',
        '',
        'Coarsely ground black pepper',
        '',
        'Heat oil in a 4 qt. saucepan over medium heat. Add onion and sauté until soft, about 5 minutes.',
      );
      expect(checklistIngredients(input)).toBe(
        md(
          'African Peanut Stew',
          '',
          '- [ ] 1 tbsp. olive oil',
          '- [ ] ½ cup chopped carrot',
          '- [ ] 1 (14 oz.) can diced tomatoes, drained',
          '- [ ] Coarsely ground black pepper',
          '',
          'Heat oil in a 4 qt. saucepan over medium heat. Add onion and sauté until soft, about 5 minutes.',
        ),
      );
    });

    it('checklists .doc plain text with • bullets and skips detail lines', () => {
      const input = md(
        'GF pancakes',
        '',
        'Source: Krusteaz GF flour bag',
        '',
        '• 1 ¼ cup flour  ',
        '•1 tbsp sugar',
        '¾ cup milk',
      );
      expect(checklistIngredients(input)).toBe(
        md('GF pancakes', '', 'Source: Krusteaz GF flour bag', '', '- [ ] 1 ¼ cup flour', '- [ ] 1 tbsp sugar', '- [ ] ¾ cup milk'),
      );
    });

    it('accepts a two-line list when both lines have amounts', () => {
      const input = md('Chocolate Glaze', '', '6 oz. chocolate chips', '6 tbsp. butter', '', 'Melt the chocolate in the microwave, stirring often.');
      expect(checklistIngredients(input)).toContain('- [ ] 6 oz. chocolate chips\n- [ ] 6 tbsp. butter');
    });

    it('includes ingredients without amounts when enough of the run has them', () => {
      const input = md('Beef Asparagus', 'Bunch of asparagus', 'Sliced almonds', '1 lb. ground beef', '7 spice mixture to taste', 'Sprinkle of salt');
      expect(checklistIngredients(input)).toBe(
        md(
          'Beef Asparagus',
          '- [ ] Bunch of asparagus',
          '- [ ] Sliced almonds',
          '- [ ] 1 lb. ground beef',
          '- [ ] 7 spice mixture to taste',
          '- [ ] Sprinkle of salt',
        ),
      );
    });

    it('treats a first line with an amount as an ingredient', () => {
      expect(checklistIngredients(md('½ cup butter', '1 tsp vanilla', '¾ cup sugar'))).toBe(
        md('- [ ] ½ cup butter', '- [ ] 1 tsp vanilla', '- [ ] ¾ cup sugar'),
      );
    });
  });

  describe('leaves alone', () => {
    it.each([
      ['docs that already have a checklist', md('## Ingredients', '- [ ] 1 cup flour', '* 2 eggs')],
      ['lists with too few amounts', md('Shrimp Spaghetti', 'Butter', 'Garlic', 'Salt and Pepper', 'Basil')],
      ['numbered steps', md('1. Preheat the oven.', '2. Mix 2 cups flour.', '3. Bake for 20 minutes.')],
      ['instructions only', md('Step 1: Preheat oven.', 'Step 2: Mix flour and sugar.', 'Enjoy!')],
      ['empty docs', ''],
    ])('%s', (_, input) => {
      expect(checklistIngredients(input)).toBe(input);
    });
  });
});
