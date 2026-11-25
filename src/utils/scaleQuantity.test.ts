import { describe, it, expect } from 'vitest';
import { formatQuantity, parseLeadingQuantity, scaleQuantity } from '@utils/scaleQuantity';

describe('parseLeadingQuantity', () => {
  it.each<[string, number[], string]>([
    ['2 cups milk', [2], '2'],
    ['½ lb. smoked sausage', [0.5], '½'],
    ['1 ½ tbsp. brown sugar', [1.5], '1 ½'],
    ['1½ cup pumpkin puree', [1.5], '1½'],
    ['2 ⅔ c. powdered sugar', [2 + 2 / 3], '2 ⅔'],
    ['1/4 cup rice vinegar', [0.25], '1/4'],
    ['1 1/2 cups flour', [1.5], '1 1/2'],
    ['1.5 tsp sea salt', [1.5], '1.5'],
    ['12 oz pasta', [12], '12'],
    ['7-8 c. shredded lettuce', [7, 8], '7-8'],
    ['2–4 teaspoons honey', [2, 4], '2–4'],
    ['1 to 2 limes', [1, 2], '1 to 2'],
    ['  3 eggs', [3], '3'],
  ])('reads %j', (text, values, quantityText) => {
    const q = parseLeadingQuantity(text)!;
    expect(q.values.map((v) => Number(v.toFixed(6)))).toEqual(values.map((v) => Number(v.toFixed(6))));
    expect(text.slice(q.start, q.end)).toBe(quantityText);
  });

  it.each([
    ['1 14-oz. can diced tomatoes', '1'],
    ['1 16 oz. can kidney beans', '1'],
    ['1 3 ½ oz. pepperoni', '1'],
    ['14-oz. can', '14'],
  ])('leaves the package size in %j alone', (text, quantityText) => {
    const q = parseLeadingQuantity(text)!;
    expect(text.slice(q.start, q.end)).toBe(quantityText);
  });

  it.each(['Salt and pepper', 'A couple squirts of tabasco', '(optional) 2 tsp honey', '', '0 cups', '1/0 cup'])(
    'returns null for %j',
    (text) => {
      expect(parseLeadingQuantity(text)).toBeNull();
    },
  );

  it('flags decimals', () => {
    expect(parseLeadingQuantity('1.5 tsp')!.decimal).toBe(true);
    expect(parseLeadingQuantity('1 ½ tsp')!.decimal).toBe(false);
  });
});

describe('formatQuantity', () => {
  it.each<[number, string]>([
    [3, '3'],
    [0.5, '½'],
    [1.5, '1 ½'],
    [2 / 3, '⅔'],
    [1 / 6, '⅙'],
    [0.125, '⅛'],
    [2.999999, '3'],
    [0.7, '0.7'],
  ])('formats %d as %j', (value, expected) => {
    expect(formatQuantity(value)).toBe(expected);
  });

  it('keeps decimals when asked', () => {
    expect(formatQuantity(0.75, true)).toBe('0.75');
    expect(formatQuantity(3, true)).toBe('3');
  });
});

describe('scaleQuantity', () => {
  const scale = (text: string, factor: number) => scaleQuantity(parseLeadingQuantity(text)!, factor);

  it('scales single amounts and keeps fractions', () => {
    expect(scale('1 ½ c. water', 2)).toBe('3');
    expect(scale('⅓ c. butter', 2)).toBe('⅔');
    expect(scale('¾ tsp salt', 0.5)).toBe('⅜');
    expect(scale('2 cans tuna', 1.5)).toBe('3');
    expect(scale('1/4 cup vinegar', 3)).toBe('¾');
  });

  it('scales both ends of a range, keeping the separator', () => {
    expect(scale('7-8 c. lettuce', 0.5)).toBe('3 ½-4');
    expect(scale('1 to 2 limes', 3)).toBe('3 to 6');
  });

  it('keeps decimal amounts as decimals', () => {
    expect(scale('1.5 tsp salt', 2)).toBe('3');
    expect(scale('1.5 tsp salt', 0.5)).toBe('0.75');
  });

  it('is unchanged at 1×', () => {
    expect(scale('2 ⅔ c. sugar', 1)).toBe('2 ⅔');
  });
});
