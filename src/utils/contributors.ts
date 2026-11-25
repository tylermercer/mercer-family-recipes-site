/** Everyone who contributes recipes, in the order families are listed on the site. */
export const CONTRIBUTORS = [
  'Mom & Dad',
  'Dan & Leanna',
  'Eve & Tyler',
  'EJ & Liza',
  'Russell',
] as const;

export type Contributor = (typeof CONTRIBUTORS)[number];
