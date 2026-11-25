import { describe, it, expect } from 'vitest';
import { MAX_SCALE_FACTOR, parseScaleFactor } from '@utils/parseScaleFactor';

describe('parseScaleFactor', () => {
  it.each<[string, number]>([
    ['2', 2],
    ['1.5', 1.5],
    ['.75', 0.75],
    ['1,5', 1.5],
    ['2/3', 2 / 3],
    ['1 1/2', 1.5],
    ['1½', 1.5],
    ['½', 0.5],
    ['1.5x', 1.5],
    ['3 ×', 3],
    ['  4  ', 4],
    [String(MAX_SCALE_FACTOR), MAX_SCALE_FACTOR],
  ])('reads %j as %d', (input, expected) => {
    expect(parseScaleFactor(input)).toBeCloseTo(expected);
  });

  it.each(['', '   ', 'x', 'abc', '0', '0.0', '-2', '1-2', '2 cups', '1/0', String(MAX_SCALE_FACTOR + 1)])(
    'rejects %j',
    (input) => {
      expect(parseScaleFactor(input)).toBeNull();
    },
  );
});
