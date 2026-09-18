import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PAGES = ['index.html', 'projects.html', 'music.html', 'workshop.html', 'projects/cache-it.html'];
const stackCss = readFileSync('src/styles/stack.css', 'utf8');

/**
 * Matches a plate that directly wraps a frame figure.
 *
 * `[^>]*` for the div's attributes, NOT `[^"]*"` — the hero plates carry
 * `aria-hidden="true"` after their class, and a pattern that stops at the
 * closing class quote silently skipped three of index.html's plate
 * figures, including both hero layers. A guard that passes on a broken home
 * hero is worse than no guard, so the count is asserted below.
 */
const PLATE_FIGURE = /<div class="plate[^>]*>\s*<figure class="frame[^>]*>/g;

describe('full-bleed plate frames', () => {
  it('stack.css makes a frame inside a plate fill that plate', () => {
    // The plate defines the box; object-fit: cover on the img does the fitting.
    expect(stackCss).toMatch(/\.plate\s*>\s*\.frame\s*\{[^}]*aspect-ratio:\s*auto/);
    expect(stackCss).toMatch(/\.plate\s*>\s*\.frame\s*\{[^}]*width:\s*100%/);
    // Height is no longer a bare 100%: .plate's inset: -12% -3% overscan is a
    // PERCENTAGE of viewport height, but parallax travel (--p * --rate * 1px)
    // is in PIXELS, so any plate whose |--rate| exceeds the overscan (108px
    // at 900px viewport — fog/mid/name/near/low on the hero all do) rides its
    // bottom edge into the viewport, exposing a bare strip below the frame.
    // The frame's painted surface is extended downward by the travel via
    // `calc(100% - var(--rate, 0) * 1px)` (--rate is negative, so subtracting
    // it adds height) while the PLATE's own layout box is left untouched —
    // growing the plate itself would drop plate--name/plate--copy's
    // grid-centred content ~125px below viewport centre. See
    // tests/plate-coverage.test.ts for the fuller invariant and arithmetic.
    expect(stackCss).toMatch(/\.plate\s*>\s*\.frame\s*\{[^}]*height:\s*calc\(100%\s*-\s*var\(--rate,\s*0\)\s*\*\s*1px\)/);
  });

  describe.each(PAGES)('%s', (page) => {
    const html = readFileSync(page, 'utf8');
    const plateFigures = html.match(PLATE_FIGURE) ?? [];

    it('finds the plate figures at all, or every assertion below is vacuous', () => {
      expect(plateFigures.length).toBeGreaterThan(0);
    });

    it('gives no plate figure an inline height that fights the plate', () => {
      // A frame that IS the plate background must not size itself. Inline
      // height:100% plus aspect-ratio is what anchored these left and made
      // them miss the plate by up to 948px.
      plateFigures.forEach((f) => expect(f).not.toMatch(/height:\s*100%/));
    });

    it('still labels every frame', () => {
      const frames = html.match(/<figure class="frame[^"]*"[^>]*>/g) ?? [];
      frames.forEach((f) => expect(f).toContain('data-label='));
    });
  });
});

describe('the guard actually reaches the pages it claims to', () => {
  // index.html is the page that had the worst measured misalignment AND the
  // most aria-hidden plates, so it is the one a loose pattern fails on.
  it('sees all four of index.html plate figures, not just the one without aria-hidden', () => {
    const html = readFileSync('index.html', 'utf8');
    // Four: the hero's two photograph plates (plate--far and plate--shrub —
    // plate--fog and plate--low are CSS atmosphere with no frame of their
    // own) plus the thesis stack's two. Both side-foliage plates were removed.
    expect(html.match(PLATE_FIGURE) ?? []).toHaveLength(4);
  });
});
