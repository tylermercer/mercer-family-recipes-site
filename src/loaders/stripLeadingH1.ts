// ATX heading ("# Title", optionally closed with #s) or setext heading ("Title\n====="),
// preceded only by blank lines.
const LEADING_H1 = /^(?:[ \t]*\r?\n)*(?: {0,3}#(?:[ \t]+[^\r\n]*)?|[ \t]*\S[^\r\n]*\r?\n {0,3}=+[ \t]*)(?:\r?\n|$)/;

/**
 * Removes the document's leading h1, if it has one. The recipe page renders the title itself,
 * so a title heading at the top of the doc would otherwise appear twice.
 */
export function stripLeadingH1(markdown: string): string {
  if (!markdown) return markdown;
  const match = markdown.match(LEADING_H1);
  return match ? markdown.slice(match[0].length).replace(/^(?:[ \t]*\r?\n)+/, '') : markdown;
}
