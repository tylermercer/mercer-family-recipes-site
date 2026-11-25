const VULGAR: Record<string, number> = {
  '½': 1 / 2,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 1 / 4,
  '¾': 3 / 4,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
};
const VULGAR_CHARS = Object.keys(VULGAR).join('');

// A single amount: "1 ½", "1½", "1 1/2", "½", "1/2", "1.5", or "2".
const AMOUNT = `(?:\\d+\\s*[${VULGAR_CHARS}]|\\d+\\s+\\d+/\\d+|[${VULGAR_CHARS}]|\\d+/\\d+|\\d*\\.\\d+|\\d+)`;
// An amount, optionally a range: "7-8", "2–4", "1 to 2".
const LEADING_QUANTITY = new RegExp(
  `^(\\s*)(${AMOUNT})(?:(\\s*[-–—]\\s*|\\s+to\\s+)(${AMOUNT}))?(?![\\d/.${VULGAR_CHARS}])`,
);

export interface LeadingQuantity {
  /** Where the quantity starts in the text (after any leading whitespace). */
  start: number;
  /** Where the quantity ends in the text. */
  end: number;
  /** One amount, or the two ends of a range. */
  values: number[];
  /** Text between the two ends of a range, e.g. "-" or " to ". */
  separator: string;
  /** Whether the source wrote a decimal ("1.5"), so the scaled amount stays a decimal. */
  decimal: boolean;
}

function parseAmount(raw: string): number {
  const s = raw.trim();
  const vulgar = s.match(new RegExp(`^(\\d*)\\s*([${VULGAR_CHARS}])$`));
  if (vulgar) return Number(vulgar[1] || 0) + VULGAR[vulgar[2]];
  const fraction = s.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1] ?? 0) + Number(fraction[2]) / Number(fraction[3]);
  return Number(s);
}

/**
 * Finds the amount at the start of an ingredient line, e.g. the "1 ½" in "1 ½ c. water" or
 * the "7-8" in "7-8 c. lettuce". Only the leading amount counts, so a package size after it
 * ("1 14-oz. can") is left alone. Returns null when the line doesn't start with an amount or the
 * amount is zero or a bad fraction like "1/0".
 */
export function parseLeadingQuantity(text: string): LeadingQuantity | null {
  const match = text.match(LEADING_QUANTITY);
  if (!match) return null;
  const [whole, leading, first, separator = '', second] = match;
  const values = [first, second].filter((v): v is string => v !== undefined).map(parseAmount);
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) return null;
  return {
    start: leading.length,
    end: whole.length,
    values,
    separator,
    decimal: [first, second].some((v) => v?.includes('.')),
  };
}

// Fractions we round to, simplest first so ties go to the friendlier one.
const FRACTIONS: [number, string][] = [
  [1 / 2, '½'],
  [1 / 3, '⅓'],
  [2 / 3, '⅔'],
  [1 / 4, '¼'],
  [3 / 4, '¾'],
  [1 / 8, '⅛'],
  [3 / 8, '⅜'],
  [5 / 8, '⅝'],
  [7 / 8, '⅞'],
  [1 / 6, '⅙'],
  [5 / 6, '⅚'],
];
const TOLERANCE = 0.02;

function formatDecimal(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * Formats an amount the way recipes write it: whole numbers plus a Unicode fraction ("1 ½", "⅔"),
 * rounded to the nearest common kitchen fraction. Falls back to a decimal when no common fraction
 * is close, or when `decimal` is set because the source wrote one.
 */
export function formatQuantity(value: number, decimal = false): string {
  if (decimal) return formatDecimal(value);
  let whole = Math.floor(value);
  let remainder = value - whole;
  if (remainder < TOLERANCE) return String(whole);
  if (1 - remainder < TOLERANCE) return String(whole + 1);
  let best: [number, string] | undefined;
  for (const candidate of FRACTIONS) {
    const error = Math.abs(candidate[0] - remainder);
    if (error < TOLERANCE && (!best || error < Math.abs(best[0] - remainder) - 1e-9)) best = candidate;
  }
  if (!best) return formatDecimal(value);
  return whole === 0 ? best[1] : `${whole} ${best[1]}`;
}

/** The leading quantity's text scaled by `factor`, e.g. "1 ½" × 2 -> "3", "7-8" × ½ -> "3 ½-4". */
export function scaleQuantity(quantity: LeadingQuantity, factor: number): string {
  return quantity.values
    .map((value) => formatQuantity(value * factor, quantity.decimal))
    .join(quantity.separator);
}
