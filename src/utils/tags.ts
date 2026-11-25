/**
 * Normalizes a tag from a folder name or hashtag so the same tag written different ways is one
 * tag: lowercased, with underscores and hyphens treated as spaces, e.g. "Main_Dishes" and
 * "main-dishes" both become "main dishes".
 */
export function normalizeTag(raw: string): string {
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** URL slug for a (normalized) tag, e.g. "main dishes" -> "main-dishes". */
export function tagSlug(tag: string): string {
  return normalizeTag(tag)
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/** Path of the page listing a tag's recipes. */
export function tagPath(tag: string): string {
  return `/tags/${tagSlug(tag)}`;
}

/** Normalizes, drops empties, and deduplicates (by slug) a list of tags, keeping first-seen order. */
export function uniqueTags(tags: Iterable<string>): string[] {
  const bySlug = new Map<string, string>();
  for (const raw of tags) {
    const tag = normalizeTag(raw);
    const slug = tagSlug(tag);
    if (slug && !bySlug.has(slug)) bySlug.set(slug, tag);
  }
  return [...bySlug.values()];
}
