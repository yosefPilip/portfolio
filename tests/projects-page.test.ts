import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PROJECTS } from '../src/data/projects';
import { findForbiddenCopy } from '../src/lib/guards';

const html = readFileSync('projects.html', 'utf8');

/**
 * The data module holds literal typographic characters (’ – — ·) while the
 * hand-written markup spells them as named entities, so the two sides cannot
 * be compared raw. Decoding the markup is the honest direction: stripping the
 * punctuation from both instead would let a real copy change slip through.
 */
const ENTITIES: Record<string, string> = {
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…',
  '&middot;': '·',
  '&nbsp;': ' ',
  '&amp;': '&',
};

function decodeEntities(source: string): string {
  return source
    .replace(/&[a-z]+;/gi, (entity) => {
      const glyph = ENTITIES[entity.toLowerCase()];
      if (glyph === undefined) throw new Error(`Unmapped entity in projects.html: ${entity}`);
      return glyph;
    })
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

/** One project's `<article>`, from its data-slug to the tag that closes it. */
function rowFor(slug: string): string {
  const start = html.indexOf(`data-slug="${slug}"`);
  if (start < 0) throw new Error(`No row for ${slug}`);
  const end = html.indexOf('</article>', start);
  return html.slice(start, end);
}

/** The decoded text of the one `<span class="<cls> …">` inside a row. */
function cellText(row: string, cls: string): string {
  const match = row.match(new RegExp(`<span class="${cls}[^"]*">([\\s\\S]*?)</span>`));
  if (!match) throw new Error(`No .${cls} in row`);
  return decodeEntities(match[1]).replace(/\s+/g, ' ').trim();
}

describe('projects.html', () => {
  it('declares the projects room', () => {
    expect(html).toMatch(/<body[^>]*data-room="projects"/);
  });

  it('renders every project as a real row, in the fixed order', () => {
    const slugs = Array.from(html.matchAll(/data-slug="([a-z-]+)"/g)).map((m) => m[1]);
    expect(slugs).toEqual(PROJECTS.map((p) => p.slug));
  });

  it('tags each row with the category its data says', () => {
    for (const p of PROJECTS) {
      const row = html.match(new RegExp(`data-slug="${p.slug}"[^>]*`))![0];
      expect(row).toContain(`data-category="${p.category}"`);
    }
  });

  /**
   * title, hook and year are hand-duplicated from src/data/projects.ts into
   * this markup with nothing reconciling them. Compared cell by cell rather
   * than as "the row contains the string somewhere", because a bare
   * containment check passes trivially for a year like "2026" or a hook that
   * is a single em dash, and so could not catch the drift it exists to catch.
   */
  it('repeats the data module\'s title, hook and year exactly, in every row', () => {
    for (const p of PROJECTS) {
      const row = rowFor(p.slug);
      expect(cellText(row, 'work-row__name'), `${p.slug} title`).toBe(p.title);
      expect(cellText(row, 'work-row__hook'), `${p.slug} hook`).toBe(p.hook);
      expect(cellText(row, 'work-row__year'), `${p.slug} year`).toBe(p.year);
    }
  });

  it('does not repeat the six-layer hero', () => {
    for (const layer of ['plate--canopy', 'plate--trunks', 'plate--name']) {
      expect(html).not.toContain(layer);
    }
  });

  it('carries no banned copy', () => {
    expect(findForbiddenCopy(html)).toEqual([]);
  });

  /**
   * The no-JS contract. Tier 2 lives inside .work-detail, and the only in-page
   * link to the Cache It case study lives inside one of them — shipping those
   * `hidden` behind buttons that do nothing without scripting sealed them off
   * entirely. The filter pills are the mirror image: useless without JS, so
   * they ship hidden and the enhancer reveals them.
   */
  it('ships every detail open and the filters hidden, for the no-JS visitor', () => {
    const details = html.match(/<div class="work-detail"[^>]*>/g) ?? [];
    expect(details).toHaveLength(PROJECTS.length);
    for (const detail of details) expect(detail).not.toContain('hidden');
    expect(html).toMatch(/<div class="filters"[^>]*\shidden[\s>]/);
  });

  it('offers all four filters', () => {
    for (const value of ['all', 'ai', 'fullstack', 'tools']) {
      expect(html).toContain(`data-filter="${value}"`);
    }
  });

  /**
   * The one thing keeping the flagship case study readable, and the only
   * behaviour on this page that no TypeScript signature can protect.
   *
   * open() stops Lenis so the index cannot scroll behind the overlay, and a
   * stopped Lenis preventDefault()s every wheel event in the document — the
   * overlay's own overflow-y: auto then never receives one and the case study
   * can only be read by dragging the scrollbar, which is exactly what shipped.
   * This attribute is Lenis's documented escape hatch and it is checked BEFORE
   * the stopped branch, so losing it silently restores the bug. jsdom has no
   * layout and no Lenis, so the markup is the only place this can be caught.
   */
  it('keeps the wheel escape hatch on the case-study overlay', () => {
    expect(html).toMatch(/<div class="cs-overlay"[^>]*\sdata-lenis-prevent[\s>]/);
  });
});
