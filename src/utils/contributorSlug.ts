/**
 * Turns a contributor name into a URL slug, e.g. "Eve & Tyler" -> "eve-and-tyler".
 */
export function contributorSlug(contributor: string): string {
  return contributor
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/** Path of the page listing a contributor's recipes. */
export function contributorPath(contributor: string): string {
  return `/family/${contributorSlug(contributor)}`;
}
