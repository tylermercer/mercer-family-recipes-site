/** Longest description we emit; link previews (Slack, Discord) cut off around here anyway. */
export const MAX_DESCRIPTION_LENGTH = 160;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/**
 * The top-level ingredient checklist items in a recipe's rendered HTML, as plain text, in order.
 * Nested notes under an ingredient are left out.
 */
export function ingredientsFromHtml(html: string): string[] {
  const items: string[] = [];
  for (const match of html.matchAll(/<li class="task-list-item">([\s\S]*?)(?=<\/li>|<ul|<ol)/g)) {
    const text = decodeEntities(match[1].replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim();
    if (text) items.push(text);
  }
  return items;
}

/**
 * A recipe's link-preview description: who it's from, then as many ingredients as fit in
 * {@link MAX_DESCRIPTION_LENGTH} characters, e.g.
 * "From Mom & Dad. Ingredients: 1 tbsp. olive oil · ½ cup chopped carrot · and more." The
 * separator is a middle dot because ingredients often contain commas ("1 onion, chopped").
 */
export function recipeDescription(contributor: string, html: string): string {
  const lead = `From ${contributor}.`;
  const ingredients = ingredientsFromHtml(html);
  if (ingredients.length === 0) return `${lead} A recipe from the Mercer family cookbook.`;

  const prefix = `${lead} Ingredients: `;
  const separator = ' · ';
  const more = `${separator}and more.`;
  let listed = '';
  for (const [i, ingredient] of ingredients.entries()) {
    const next = listed ? `${listed}${separator}${ingredient}` : ingredient;
    const isLast = i === ingredients.length - 1;
    const ending = isLast ? '.' : more;
    if ((prefix + next + ending).length > MAX_DESCRIPTION_LENGTH) {
      // Not even the first ingredient fits: cut it short rather than listing nothing.
      if (!listed) {
        const room = MAX_DESCRIPTION_LENGTH - prefix.length - 1;
        return `${prefix}${ingredient.slice(0, room - 1).trimEnd()}…`;
      }
      return `${prefix}${listed}${more}`;
    }
    listed = next;
  }
  return `${prefix}${listed}.`;
}
