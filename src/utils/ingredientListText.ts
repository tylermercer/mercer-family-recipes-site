const HEADING = /^H[1-6]$/;

/** Text of a list item without its nested lists, with whitespace collapsed. */
function ownText(item: Element): string {
  const clone = item.cloneNode(true) as Element;
  clone.querySelectorAll('ul, ol').forEach((list) => list.remove());
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function listLines(list: Element, depth: number): string[] {
  const lines: string[] = [];
  for (const item of list.children) {
    if (item.tagName !== 'LI') continue;
    const text = ownText(item);
    if (text) lines.push(`${'  '.repeat(depth)}- ${text}`);
    for (const nested of item.querySelectorAll(':scope > ul, :scope > ol')) {
      lines.push(...listLines(nested, depth + 1));
    }
  }
  return lines;
}

/**
 * Builds plain text for the clipboard from a recipe's ingredient checklists (the GFM task lists in
 * `root`), one "- " line per ingredient with nested notes indented. When a recipe has several
 * lists, each one is labeled with the heading right before it (e.g. "Crust", "Filling") so the
 * groups stay distinguishable. Reads the live DOM, so scaled quantities are copied as shown.
 */
export function ingredientListText(root: ParentNode): string {
  const lists = [...root.querySelectorAll('.contains-task-list')].filter(
    (list) => !list.parentElement?.closest('.contains-task-list'),
  );
  const groups = lists.map((list) => {
    const lines = listLines(list, 0);
    const heading = list.previousElementSibling;
    if (lists.length > 1 && heading && HEADING.test(heading.tagName)) {
      const label = (heading.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (label) lines.unshift(label);
    }
    return lines.join('\n');
  });
  return groups.filter(Boolean).join('\n\n');
}
