import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

/**
 * Every image inside a parallax plate must be a GENERATED .webp, never a
 * reference file.
 *
 * This exists because it has now happened twice. The visual editing panel
 * rewrites a slot's `src` when an image is dropped into it, which is exactly
 * what it is for — but the owner drops REFERENCE photographs into slots too,
 * to hand them to the generator. When that happens the page silently starts
 * serving the reference: a 643x360 stock jpeg stretched across a 1526px hero
 * plate, a 2.4x upscale, which reads as "the background is blurry" and sends
 * everyone hunting the wrong bug. The generated plate meanwhile sat on disk,
 * correct and unused, and the intro overlay — which names the file in CSS
 * rather than in markup — kept showing it, so the two halves of the page
 * disagreed.
 *
 * Ruling 7 in the SDD ledger records the same class of accident on Projects,
 * where stock references reached a commit. The rule is cheap to state and
 * catches all of it: generated plates are .webp; references are whatever the
 * owner downloaded.
 */

const PAGES = ['index.html', 'projects.html', 'music.html', 'workshop.html', 'projects/cache-it.html'];

describe('parallax plates never point at a reference file', () => {
  it.each(PAGES)('%s serves only generated .webp plates', (page) => {
    const { document } = new JSDOM(readFileSync(page, 'utf8')).window;
    const bad: string[] = [];
    for (const img of document.querySelectorAll('.plate img')) {
      const src = img.getAttribute('src') ?? '';
      if (!src.endsWith('.webp')) bad.push(src);
    }
    expect(bad).toEqual([]);
  });
});
