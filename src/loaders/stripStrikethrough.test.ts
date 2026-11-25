import { describe, it, expect } from 'vitest';
import { stripStrikethrough } from './stripStrikethrough';

describe('stripStrikethrough', () => {
  it('removes double-tilde strikethrough, keeping the text', () => {
    expect(stripStrikethrough('- [x] ~~1 tablespoon olive oil~~')).toBe('- [x] 1 tablespoon olive oil');
  });

  it('handles several strikethroughs, including mid-line', () => {
    expect(stripStrikethrough('Use ~~2~~ 3 cups and ~~salt~~.\n~~Line two~~')).toBe(
      'Use 2 3 cups and salt.\nLine two',
    );
  });

  it('removes single-tilde strikethrough', () => {
    expect(stripStrikethrough('~struck~ text')).toBe('struck text');
  });

  it('keeps formatting nested inside the strikethrough', () => {
    expect(stripStrikethrough('~~**1 cup** [flour](/flour)~~')).toBe('**1 cup** [flour](/flour)');
  });

  it('removes HTML strikethrough tags', () => {
    expect(stripStrikethrough('<del>a</del> <s class="x">b</s> <strike>c</strike>')).toBe('a b c');
  });

  it('leaves approximate quantities and lone tildes alone', () => {
    for (const md of [
      'About ~2 cups',
      '~ 1 cup ~',
      'Bake 20~25 minutes',
      '~~ spaced ~~',
      'escaped \\~~not struck~~',
      '~~~',
    ]) {
      expect(stripStrikethrough(md)).toBe(md);
    }
  });

  it('does not join across lines', () => {
    expect(stripStrikethrough('~~start\nend~~')).toBe('~~start\nend~~');
  });

  it('leaves code spans and fenced code blocks untouched', () => {
    expect(stripStrikethrough('`~~code~~` ~~text~~')).toBe('`~~code~~` text');
    expect(stripStrikethrough('```\n~~code~~\n```\n~~text~~')).toBe('```\n~~code~~\n```\ntext');
  });

  it('returns empty input unchanged', () => {
    expect(stripStrikethrough('')).toBe('');
  });
});
