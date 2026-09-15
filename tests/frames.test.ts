import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PAGES = ['index.html', 'projects.html', 'music.html', 'workshop.html', 'projects/cache-it.html'];
const stackCss = readFileSync('src/styles/stack.css', 'utf8');

/**
 * Matches a plate that directly wraps a frame figure.
 *
 * `[^>]*` for the div's attributes, NOT `[^"]*"` — the hero plates carry
 * `aria-hidden="true"` after their class, and a pattern that stops at the
 * closing class quote silently skipped three of index.html's four plate
 * figures, including both hero layers. A guard that passes on a broken home
 * hero is worse than no guard, so the count is asserted below.
 */
const PLATE_FIGURE = /<div class="plate[^>]*>\s*<figure class="frame[^>]*>/g;

describe('full-bleed plate frames', () => {
  it('stack.css makes a frame inside a plate fill that plate', () => {
    // The plate defines the box; object-fit: cover on the img does the fitting.
    expect(stackCss).toMatch(/\.plate\s*>\s*\.frame\s*\{[^}]*aspect-ratio:\s*auto/);
    expect(stackCss).toMatch(/\.plate\s*>\s*\.frame\s*\{[^}]*width:\s*100%/);
    expect(stackCss).toMatch(/\.plate\s*>\s*\.frame\s*\{[^}]*height:\s*100%/);
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
    expect(html.match(PLATE_FIGURE) ?? []).toHaveLength(4);
  });
});
