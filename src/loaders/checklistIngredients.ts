import { parseLeadingQuantity } from '@utils/scaleQuantity';

/**
 * Turns a recipe's ingredient list into a GFM task list (`- [ ] ...`) so every recipe gets the
 * checklist, copy, and scaling features, whatever shape the source doc was in. Runs on the
 * markdown from all three sources: Google Docs exports, .docx (mammoth + turndown), and .doc
 * (word-extractor plain text).
 *
 * Two ways to find the list:
 *
 * 1. **Labeled section.** A heading or label line reading "Ingredients" (any heading level, bold,
 *    trailing colon) starts the section. It runs until a heading at the same or a higher level,
 *    or a label such as "Instructions", "Steps", or "Equipment". Deeper headings inside it
 *    ("### Crust") are subsections and stay. Bullets (`*`, `-`, `+`, `•`) become checklist items.
 *    If the section has no bullets, each short plain line becomes an item instead, and a
 *    wrapped prep fragment ("minced", "thinly sliced") joins the item before it.
 * 2. **Unlabeled run.** With no Ingredients label anywhere, a run of three or more short lines
 *    (blank lines between them allowed, as .docx paragraphs have) where at least two lines, and
 *    at least 40%, start with an amount becomes the list, as does a pair of lines that both do.
 *    The doc's first line is its title unless it starts with an amount, and lines like
 *    "Source: ..." or "Serves: 4" are details, not ingredients.
 *
 * Docs that already have a checklist are left alone, since the author made it on purpose.
 */
export function checklistIngredients(markdown: string): string {
  if (!markdown.trim() || TASK_ITEM.test(markdown)) return markdown;
  const lines = markdown.split(/\r?\n/);
  const sections = findLabeledSections(lines);
  const ranges = sections.length > 0 ? sections : findUnlabeledRuns(lines);
  if (ranges.length === 0) return markdown;

  const out: string[] = [];
  let next = 0;
  for (const range of ranges) {
    out.push(...lines.slice(next, range.start));
    out.push(...convertRange(lines.slice(range.start, range.end), range.plainLines));
    next = range.end;
  }
  out.push(...lines.slice(next));
  return out.join('\n');
}

const TASK_ITEM = /^\s*[-*+]\s+\[[ xX]\]\s/m;
const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^(\s*)(?:[-*+]|•)\s*(.*)$/;
const STRICT_BULLET = /^(\s*)(?:[-*+]\s+|•\s*)(.*)$/;
const ORDERED = /^\s*\d+[.)]\s/;
const INGREDIENTS_LABEL = /^(?:ingredients?(?: list)?|what you(?:'|’)?ll need|you(?:'|’)?ll need|you will need)$/i;
const OTHER_LABEL =
  /^(?:instructions?|directions?|preparation|prep|method|steps?|procedure|equipment|tools|notes?|source|nutrition(?: facts)?|to serve|serving)$/i;
// A wrapped fragment that finishes the ingredient above it ("minced", "thinly sliced"), as
// opposed to a lowercase ingredient of its own ("olive oil", "salt and pepper to taste").
const CONTINUATION =
  /^(?:finely|thinly|roughly|coarsely|freshly|minced|chopped|diced|sliced|divided|softened|melted|drained|rinsed|peeled|grated|shredded|cubed|crushed|beaten|halved|quartered|optional|or|plus|one of|such as|see)\b/;
// "Label: value" detail lines near the top of a recipe.
const METADATA =
  /^(?:source|from|by|author|based on|adapted from|serves|servings|serving amount|yield|makes|prep(?: time)?|cook(?: time)?|total(?: time)?|without|notes?):$/i;
// Above this a plain line reads as a sentence of instructions, not an ingredient.
const MAX_ITEM_LENGTH = 100;

interface Range {
  start: number;
  end: number;
  /** Convert plain lines (not just bullets) into items. */
  plainLines: boolean;
}

/** Label text of a line with markdown emphasis, escapes, and a trailing colon removed. */
function labelText(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/[*_\\]/g, '')
    .replace(/:\s*$/, '')
    .trim();
}

function headingLevel(line: string): number | null {
  const match = line.match(HEADING);
  return match ? match[1].length : null;
}

/** Strips the trailing hard-break spaces or backslash that Google Docs exports put on lines. */
function trimLine(text: string): string {
  return text.replace(/(?:\s+|\\)+$/, '');
}

function isSentence(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length > MAX_ITEM_LENGTH) return true;
  // "Mix well." / "Serve with tartar sauce." but not "1 tsp. salt" or "½ c. sugar".
  return /[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length >= 4 && !parseLeadingQuantity(trimmed);
}

function startsWithAmount(text: string): boolean {
  return parseLeadingQuantity(text.replace(/^[-*+•]\s*/, '')) !== null;
}

function findLabeledSections(lines: string[]): Range[] {
  const ranges: Range[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!INGREDIENTS_LABEL.test(labelText(lines[i]))) continue;
    const level = headingLevel(lines[i]);
    let end = i + 1;
    for (; end < lines.length; end++) {
      const line = lines[end];
      const lineLevel = headingLevel(line);
      if (lineLevel !== null && (level === null || lineLevel <= level)) break;
      if (lineLevel === null && OTHER_LABEL.test(labelText(line))) break;
    }
    const body = lines.slice(i + 1, end);
    const hasBullets = body.some((line) => STRICT_BULLET.test(line));
    // Without bullets, the list stops at the first line that reads like an instruction.
    if (!hasBullets) {
      const stop = body.findIndex((line) => line.trim() && (isSentence(line) || headingLevel(line) !== null));
      if (stop !== -1) end = i + 1 + stop;
    }
    ranges.push({ start: i + 1, end, plainLines: !hasBullets });
    i = end - 1;
  }
  return ranges;
}

function findUnlabeledRuns(lines: string[]): Range[] {
  const firstContent = lines.findIndex((line) => line.trim());
  // Docs without a heading start with the recipe's name as a plain line.
  const isTitle = (i: number) => i === firstContent && !startsWithAmount(lines[i]);
  const isCandidate = (i: number) => {
    const line = lines[i];
    return (
      line.trim() !== '' &&
      !isTitle(i) &&
      headingLevel(line) === null &&
      !ORDERED.test(line) &&
      !isSentence(line) &&
      !METADATA.test(labelText(line.split(':')[0]) + ':') &&
      !/^\s*[>|]/.test(line)
    );
  };

  const ranges: Range[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!isCandidate(i)) {
      i++;
      continue;
    }
    // Extend the run across blank lines, ending on the last candidate line.
    let end = i;
    let j = i;
    while (j < lines.length && (isCandidate(j) || !lines[j].trim())) {
      if (lines[j].trim()) end = j + 1;
      j++;
    }
    const items = lines.slice(i, end).filter((line) => line.trim());
    const withAmounts = items.filter(startsWithAmount).length;
    const allAmounts = items.length >= 2 && withAmounts === items.length;
    if (allAmounts || (items.length >= 3 && withAmounts >= 2 && withAmounts / items.length >= 0.4)) {
      ranges.push({ start: i, end, plainLines: true });
    }
    i = Math.max(end, i + 1);
  }
  return ranges;
}

/** Rewrites one ingredient range as a tight task list, keeping headings and nesting. */
function convertRange(lines: string[], plainLines: boolean): string[] {
  const out: string[] = [];
  let lastWasItem = false;
  const pushItem = (indent: string, text: string) => {
    // Items separated only by blank lines (as in .docx) would render as a loose list.
    while (lastWasItem && out.length > 0 && out[out.length - 1].trim() === '') out.pop();
    out.push(`${indent}- [ ] ${text}`);
    lastWasItem = true;
  };

  for (const line of lines) {
    const trimmed = trimLine(line);
    if (!trimmed.trim()) {
      out.push('');
      continue;
    }
    if (headingLevel(trimmed) !== null) {
      out.push(trimmed);
      lastWasItem = false;
      continue;
    }
    const bullet = trimmed.match(plainLines ? BULLET : STRICT_BULLET);
    if (bullet && !ORDERED.test(trimmed)) {
      const [, indent, text] = bullet;
      // A "(note)" bullet is a note, not something to check off.
      if (text.startsWith('(')) {
        out.push(`${indent}- ${text}`);
      } else {
        pushItem(indent, text);
      }
      continue;
    }
    if (plainLines) {
      const text = trimmed.trim();
      // A wrapped fragment like "minced" belongs to the ingredient above it.
      if (lastWasItem && CONTINUATION.test(text)) {
        out[out.length - 1] += `, ${text}`;
      } else {
        pushItem('', text);
      }
      continue;
    }
    out.push(line);
    lastWasItem = false;
  }
  return out;
}
