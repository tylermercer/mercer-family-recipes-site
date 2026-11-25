import { parseLeadingQuantity } from './scaleQuantity';

/** Largest factor accepted, so a typo like "100" doesn't produce absurd amounts. */
export const MAX_SCALE_FACTOR = 50;

/**
 * Reads a scale factor someone typed: "1.5", ".75", "2/3", "1 1/2", "1½", or "1.5x" / "1.5×".
 * Accepts a comma as the decimal mark ("1,5"). Returns null for anything else, including zero
 * and factors above {@link MAX_SCALE_FACTOR}.
 */
export function parseScaleFactor(raw: string): number | null {
  const text = raw
    .trim()
    .replace(/\s*[x×]$/i, '')
    .replace(/^(\d*),(\d+)$/, '$1.$2');
  if (!text) return null;
  const quantity = parseLeadingQuantity(text);
  // The whole input has to be the amount, and a range ("1-2") isn't a factor.
  if (!quantity || quantity.start !== 0 || quantity.end !== text.length || quantity.values.length !== 1) {
    return null;
  }
  const [factor] = quantity.values;
  return factor > 0 && factor <= MAX_SCALE_FACTOR ? factor : null;
}
