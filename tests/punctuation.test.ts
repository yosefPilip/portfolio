import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PAGES = ['index.html', 'projects.html', 'music.html', 'workshop.html', 'projects/cache-it.html'];

/**
 * The owner's rule, 2026-09-22: "no m dahses, no colons... unless theyre
 * linking 2 words together."
 *
 * Scanned against rendered TEXT, so this is about prose and nothing else.
 * Deliberately excluded:
 *   <title>      "Projects — Yosef Pilip" is a tab separator, not a sentence.
 *   data-label   internal slot ids the panel keys framing off, never rendered.
 *   comments     source notes, not copy.
 *   style/script bodies, which are full of colons that are syntax.
 * En dashes stay too: they are range marks (Aug 2024 – Jun 2028).
 */
function prose(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<title>[\s\S]*?<\/title>/g, ' ')
    .replace(/<(?:style|script)[\s\S]*?<\/(?:style|script)>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&amp;/g, '&');
}

describe.each(PAGES)('%s', (page) => {
  const text = prose(readFileSync(page, 'utf8'));

  it('uses no em dashes in prose', () => {
    const hits = text.match(/.{0,40}\u2014.{0,40}/g);
    expect(hits, `em dash: ${hits?.join(' | ')}`).toBeNull();
  });

  it('uses no colons in prose', () => {
    // URLs and clock times are excused rather than loosening the rule.
    const hits = text.replace(/https?:\/\//g, '').replace(/\d:\d/g, '').match(/.{0,40}[^\s]:.{0,40}/g);
    expect(hits, `colon: ${hits?.join(' | ')}`).toBeNull();
  });
});
