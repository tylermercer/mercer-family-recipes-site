export interface LinkedDoc {
  /** Collection entry id, which is also the page slug. */
  id: string;
  title: string;
}

const DRIVE_HOSTS = new Set(['docs.google.com', 'drive.google.com']);

/**
 * Extracts the Drive file id from a Google Docs / Drive URL, or returns undefined if the URL
 * doesn't point at a Drive file. Handles Google's `google.com/url?q=` redirect wrapper and
 * markdown backslash-escapes (e.g. `\_`) that exporters sometimes add.
 */
export function extractDriveFileId(rawUrl: string): string | undefined {
  let url: URL;
  try {
    url = new URL(rawUrl.replace(/\\(.)/g, '$1'));
  } catch {
    return undefined;
  }

  const host = url.hostname.replace(/^www\./, '');

  if (host === 'google.com' && url.pathname === '/url') {
    const target = url.searchParams.get('q');
    return target ? extractDriveFileId(target) : undefined;
  }

  if (!DRIVE_HOSTS.has(host)) return undefined;

  // e.g. /document/d/{id}/edit, /document/u/0/d/{id}, /file/d/{id}/view
  const pathMatch = url.pathname.match(/\/d\/([A-Za-z0-9_-]+)/);
  if (pathMatch) return pathMatch[1];

  // e.g. /open?id={id}
  return url.searchParams.get('id') ?? undefined;
}

// Order matters: markdown links and autolinks are matched before bare URLs so a URL is never
// rewritten twice.
const LINK_PATTERN =
  /(\]\()(<?)([^)\s>]+)(>?)((?:\s+"[^"]*")?\))|<(https?:\/\/[^>\s]+)>|(?<![(<\w])(https?:\/\/[^\s<>()\[\]]+[^\s<>()\[\].,;:!?'"])/g;

/**
 * Rewrites links that point at other documents in the collection (by Drive file id) into
 * internal site links (`/{id}`). Markdown links keep their text; autolinks and bare URLs become
 * markdown links labelled with the linked recipe's title. Links to documents that aren't in
 * the collection are left untouched.
 */
export function rewriteDriveLinks(markdown: string, docsByFileId: Map<string, LinkedDoc>): string {
  if (!markdown || docsByFileId.size === 0) return markdown;

  const lookup = (url: string) => {
    const fileId = extractDriveFileId(url);
    return fileId ? docsByFileId.get(fileId) : undefined;
  };

  return markdown.replace(
    LINK_PATTERN,
    (match, open, lt, linkUrl, gt, close, autolinkUrl, bareUrl) => {
      if (linkUrl !== undefined) {
        const doc = lookup(linkUrl);
        return doc ? `${open}${lt}/${doc.id}${gt}${close}` : match;
      }
      const url = autolinkUrl ?? bareUrl;
      const doc = lookup(url);
      return doc ? `[${escapeLinkText(doc.title)}](/${doc.id})` : match;
    },
  );
}

function escapeLinkText(text: string): string {
  return text.replace(/([\\\[\]])/g, '\\$1');
}
