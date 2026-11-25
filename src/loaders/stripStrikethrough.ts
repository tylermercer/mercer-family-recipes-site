// GFM strikethrough: "~~text~~" (or "~text~"), not escaped, not padded with spaces inside.
const TILDE_STRIKETHROUGH = /(?<![\\~])(~~?)(?=[^\s~])([^\n]*?[^\s~\\])\1(?!~)/g;
const HTML_STRIKETHROUGH = /<\/?(?:del|s|strike)\b[^>]*>/gi;

/**
 * Removes strikethrough formatting from markdown, keeping the text. Strikethrough in the
 * recipe docs is almost always left over from checking items off in Google Docs, so it
 * shouldn't carry into the site. Code spans and fenced code blocks are left alone.
 */
export function stripStrikethrough(markdown: string): string {
  if (!markdown) return markdown;
  // Split out fenced code blocks and code spans so their contents are untouched.
  const parts = markdown.split(/(^(?:```|~~~)[^\n]*\n[\s\S]*?^(?:```|~~~)[^\n]*$|`[^`\n]*`)/m);
  return parts
    .map((part, i) =>
      i % 2 === 1 ? part : part.replace(TILDE_STRIKETHROUGH, '$2').replace(HTML_STRIKETHROUGH, ''),
    )
    .join('');
}
