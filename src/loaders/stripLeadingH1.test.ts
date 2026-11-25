import { describe, it, expect } from 'vitest';
import { stripLeadingH1 } from './stripLeadingH1';

describe('stripLeadingH1', () => {
  it('removes a leading ATX h1 and the blank lines after it', () => {
    expect(stripLeadingH1('# Chocolate Cake\n\nIngredients:\n- flour')).toBe(
      'Ingredients:\n- flour',
    );
  });

  it('removes a leading h1 preceded by blank lines', () => {
    expect(stripLeadingH1('\n  \n# Title\nBody')).toBe('Body');
  });

  it('removes h1s with closing hashes, inline formatting, or no text', () => {
    expect(stripLeadingH1('# **Title** #\n\nBody')).toBe('Body');
    expect(stripLeadingH1('#\nBody')).toBe('Body');
  });

  it('removes a leading setext h1', () => {
    expect(stripLeadingH1('Chocolate Cake\n==============\n\nBody')).toBe('Body');
  });

  it('handles CRLF line endings', () => {
    expect(stripLeadingH1('# Title\r\n\r\nBody')).toBe('Body');
  });

  it('returns an empty string when the doc is only an h1', () => {
    expect(stripLeadingH1('# Title')).toBe('');
  });

  it('leaves docs that do not start with an h1 untouched', () => {
    for (const md of [
      '## Subtitle\n\nBody',
      'Intro paragraph\n\n# Later heading',
      '#hashtag not a heading',
      'Title\n------\n\nBody',
      '    # indented code',
      '',
    ]) {
      expect(stripLeadingH1(md)).toBe(md);
    }
  });

  it('only removes the first h1', () => {
    expect(stripLeadingH1('# One\n\n# Two\n\nBody')).toBe('# Two\n\nBody');
  });
});
