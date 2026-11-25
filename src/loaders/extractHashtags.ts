// A "#" that starts a word (not part of an HTML entity or "##"), followed by a letter and then
// letters, digits, underscores or hyphens. "\#" counts, since markdown exporters escape "#" so it
// isn't read as a heading; the character before the backslash is checked the same way.
// "# Heading" never matches (space after #).
const HASHTAG = /(?<![\p{L}\p{N}_&#/\\])\\?#(\p{L}[\p{L}\p{N}_-]*)/gu;

/**
 * Returns the hashtags in a markdown body (without the "#"), in order of first appearance.
 * Code spans, fenced code blocks, and URLs (including link destinations) are ignored.
 */
export function extractHashtags(markdown: string): string[] {
  if (!markdown) return [];
  // Drop code and URLs first: exporters escape a URL fragment's "#" as "\#", so URLs can't be
  // told apart from hashtags by the character before the "#" alone.
  const searchable = markdown
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/<?\b(?:https?:\/\/|www\.)[^\s<>]*>?/gi, ' ');
  const tags: string[] = [];
  for (const [, tag] of searchable.matchAll(HASHTAG)) {
    const trimmed = tag.replace(/[-_]+$/, '');
    if (!tags.includes(trimmed)) tags.push(trimmed);
  }
  return tags;
}
