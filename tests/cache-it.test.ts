import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findForbiddenCopy } from '../src/lib/guards';

const html = readFileSync('projects/cache-it.html', 'utf8');

describe('Cache It case study', () => {
  it('is a real standalone page in the projects room', () => {
    expect(html).toMatch(/<body[^>]*data-room="projects"/);
    expect(html).toContain('<main');
  });

  it('says NFC, and never claims image recognition', () => {
    expect(html).toContain('NFC');
    expect(html).toContain('NTAG 424 DNA');
    expect(html.toLowerCase()).not.toContain('image recognition');
  });

  it('carries the résumé facts', () => {
    expect(html).toContain('Zip Launchpad');
    expect(html).toContain('cache-it-one.vercel.app');
    expect(html).toContain('FastAPI');
  });

  it('has the left rail with both kinds of navigation', () => {
    expect(html).toContain('cs-rail');
    expect(html).toContain('data-rail="sections"');
    expect(html).toContain('data-rail="projects"');
  });

  /**
   * .cs-rail is hidden below 1100px, so without the sitewide chrome a phone
   * cold-loading this URL — the exact reason tier 3 owns a URL — had no way
   * off the page at all. The blocks must sit OUTSIDE <main>: the overlay
   * lifts only <main>, so anything inside it would be duplicated into the
   * overlay, and anything outside it correctly stays behind and goes inert.
   */
  it('carries the sitewide chrome, outside <main>, with Projects current', () => {
    expect(html).toContain('class="site-header"');
    expect(html).toContain('id="mobileMenu"');
    expect(html).toContain('id="menuOpen"');
    expect(html).toContain('class="site-footer"');
    expect(html).toContain('<a href="/projects.html" aria-current="page">Projects</a>');

    const mainStart = html.indexOf('<main class="cs">');
    const mainEnd = html.indexOf('</main>');
    expect(mainStart).toBeGreaterThan(-1);
    expect(html.indexOf('class="site-header"')).toBeLessThan(mainStart);
    expect(html.indexOf('id="mobileMenu"')).toBeLessThan(mainStart);
    expect(html.indexOf('class="site-footer"')).toBeGreaterThan(mainEnd);
  });

  it('uses exactly one three-layer stack, never the six-layer hero', () => {
    expect(html.match(/class="stack"/g) ?? []).toHaveLength(1);
    expect(html).not.toContain('plate--trunks');
  });

  it('carries no banned copy and no invented metrics', () => {
    expect(findForbiddenCopy(html)).toEqual([]);
    expect(html).not.toMatch(/\d+\s*%\s*(faster|uptime)/i);
  });
});
