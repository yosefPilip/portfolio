import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { MANIFEST } from '../src/panel/manifest';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

/**
 * Every page the panel may write, from the same allowlist the dev endpoint uses.
 * A page added here without `data-edit` markup is fine; a page marked up wrongly
 * is not, and that is what this suite exists to catch.
 */
const PAGES = ['index.html', 'projects.html', 'music.html', 'workshop.html', 'projects/cache-it.html'];

/** Mirrors RAWTEXT_TAGS in src/panel/server/htmlPatcher.ts — those refuse to patch. */
const RAWTEXT = new Set(['script', 'style', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript']);

function walk(node: Node, visit: (el: Element) => void): void {
  for (const child of (node as { childNodes?: Node[] }).childNodes ?? []) {
    if ('tagName' in child) visit(child as Element);
    walk(child, visit);
  }
}

function markedElements(file: string): Element[] {
  const doc = parse(readFileSync(file, 'utf8'), { sourceCodeLocationInfo: true });
  const found: Element[] = [];
  walk(doc, (el) => {
    if (el.attrs?.some((a) => a.name === MANIFEST.editAttr)) found.push(el);
  });
  return found;
}

const idOf = (el: Element): string =>
  el.attrs.find((a) => a.name === MANIFEST.editAttr)?.value ?? '';

describe.each(PAGES)('%s', (file) => {
  const marked = markedElements(file);

  it('gives every editable block a unique id', () => {
    const ids = marked.map(idOf);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    // A duplicate makes patchHtml throw, so the panel would offer an edit it can never save.
    expect([...new Set(dupes)]).toEqual([]);
  });

  it('marks only elements the patcher will accept', () => {
    const offenders = marked
      .map((el) => {
        const kids = el.childNodes ?? [];
        const textOnly = kids.length === 0 || (kids.length === 1 && kids[0].nodeName === '#text');
        if (!textOnly) return `${idOf(el)}: contains nested markup or a comment`;
        if (RAWTEXT.has(el.tagName)) return `${idOf(el)}: <${el.tagName}> is a raw-text element`;
        const loc = el.sourceCodeLocation;
        if (!loc?.startTag || !loc?.endTag) return `${idOf(el)}: <${el.tagName}> has no end tag in source`;
        return null;
      })
      .filter(Boolean);
    expect(offenders).toEqual([]);
  });

  it('never marks an id that is empty or has stray whitespace', () => {
    expect(marked.map(idOf).filter((id) => id !== id.trim() || id === '')).toEqual([]);
  });
});

describe('site-wide editable coverage', () => {
  it('offers editable copy on every page, not just Home', () => {
    // The panel shipped once with five blocks on one page, which made it unusable.
    for (const file of PAGES) {
      expect(markedElements(file).length, `${file} has no editable copy`).toBeGreaterThan(0);
    }
  });
});
