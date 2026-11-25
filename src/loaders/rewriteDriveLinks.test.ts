import { describe, it, expect } from 'vitest';
import {
  extractDriveFileId,
  rewriteDriveLinks as rewriteDriveLinksWithResult,
  type LinkedDoc,
} from './rewriteDriveLinks';

const rewriteDriveLinks = (md: string, docs: Map<string, LinkedDoc>) =>
  rewriteDriveLinksWithResult(md, docs).markdown;

describe('extractDriveFileId', () => {
  it.each([
    ['https://docs.google.com/document/d/abc_DEF-123/edit', 'abc_DEF-123'],
    ['https://docs.google.com/document/d/abc123/edit?usp=sharing#heading=h.x', 'abc123'],
    ['https://docs.google.com/document/d/abc123', 'abc123'],
    ['https://docs.google.com/document/u/0/d/abc123/edit', 'abc123'],
    ['https://drive.google.com/file/d/abc123/view?usp=drive_link', 'abc123'],
    ['https://drive.google.com/open?id=abc123', 'abc123'],
    ['https://docs.google.com/open?id=abc123', 'abc123'],
    [
      'https://www.google.com/url?q=https://docs.google.com/document/d/abc123/edit&sa=D',
      'abc123',
    ],
    ['https://docs.google.com/document/d/abc\\_123/edit', 'abc_123'],
  ])('extracts the id from %s', (url, expected) => {
    expect(extractDriveFileId(url)).toBe(expected);
  });

  it.each([
    'https://example.com/document/d/abc123/edit',
    'https://docs.google.com/document/',
    'https://www.google.com/url?q=https://example.com',
    'https://www.google.com/search?q=cookies',
    'not a url',
    '/relative/path',
    '',
  ])('returns undefined for %s', (url) => {
    expect(extractDriveFileId(url)).toBeUndefined();
  });
});

describe('rewriteDriveLinks', () => {
  const docs = new Map<string, LinkedDoc>([
    ['cookieId', { id: 'grandmas-cookies', title: "Grandma's Cookies" }],
    ['pieId', { id: 'apple-pie', title: 'Apple [Best] Pie' }],
  ]);

  it('rewrites markdown links to collection docs, keeping the link text', () => {
    const md = 'Serve with [the cookies](https://docs.google.com/document/d/cookieId/edit).';
    expect(rewriteDriveLinks(md, docs)).toBe('Serve with [the cookies](/grandmas-cookies).');
  });

  it('preserves link titles and angle-bracket destinations', () => {
    expect(
      rewriteDriveLinks('[a](https://docs.google.com/document/d/cookieId/edit "Cookies")', docs),
    ).toBe('[a](/grandmas-cookies "Cookies")');
    expect(
      rewriteDriveLinks('[a](<https://docs.google.com/document/d/cookieId/edit>)', docs),
    ).toBe('[a](</grandmas-cookies>)');
  });

  it('rewrites autolinks and bare URLs into titled links', () => {
    expect(rewriteDriveLinks('See <https://drive.google.com/file/d/pieId/view>', docs)).toBe(
      'See [Apple \\[Best\\] Pie](/apple-pie)',
    );
    expect(
      rewriteDriveLinks('See https://docs.google.com/document/d/cookieId/edit?usp=sharing.', docs),
    ).toBe("See [Grandma's Cookies](/grandmas-cookies).");
  });

  it('rewrites multiple links in one document', () => {
    const md = [
      '- [Cookies](https://docs.google.com/document/d/cookieId/edit)',
      '- [Pie](https://drive.google.com/open?id=pieId)',
    ].join('\n');
    expect(rewriteDriveLinks(md, docs)).toBe('- [Cookies](/grandmas-cookies)\n- [Pie](/apple-pie)');
  });

  it('leaves links to docs outside the collection and non-Drive links untouched', () => {
    const md = [
      '[Other](https://docs.google.com/document/d/unknownId/edit)',
      '[Site](https://example.com/recipe)',
      'https://docs.google.com/document/d/unknownId/edit',
      '<https://example.com>',
      '[Local](/apple-pie)',
    ].join('\n');
    expect(rewriteDriveLinks(md, docs)).toBe(md);
  });

  it('returns input unchanged for empty markdown or an empty doc map', () => {
    expect(rewriteDriveLinks('', docs)).toBe('');
    const md = '[a](https://docs.google.com/document/d/cookieId/edit)';
    expect(rewriteDriveLinks(md, new Map())).toBe(md);
  });

  it('reports linked docs once each, in order of first appearance', () => {
    const md = [
      '[Pie](https://drive.google.com/open?id=pieId)',
      'https://docs.google.com/document/d/cookieId/edit',
      '[Pie again](https://drive.google.com/file/d/pieId/view)',
      '[Other](https://docs.google.com/document/d/unknownId/edit)',
    ].join('\n');
    expect(rewriteDriveLinksWithResult(md, docs).linkedDocs).toEqual([
      { id: 'apple-pie', title: 'Apple [Best] Pie' },
      { id: 'grandmas-cookies', title: "Grandma's Cookies" },
    ]);
  });

  it('reports no linked docs when nothing matches', () => {
    expect(rewriteDriveLinksWithResult('[a](https://example.com)', docs).linkedDocs).toEqual([]);
    expect(rewriteDriveLinksWithResult('', docs).linkedDocs).toEqual([]);
  });
});
