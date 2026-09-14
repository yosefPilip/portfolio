import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findForbiddenCopy } from '../src/lib/guards';

// The colour-literal, pure-black/white and animated-layout-property guards
// (spec §15) already run over every stylesheet in `tests/base-css.test.ts`,
// via the shared `STYLESHEETS` list in `tests/stylesheets.ts`. They are not
// repeated here — see task-3 CONTROLLER CORRECTIONS C1. This file only adds
// what does not exist anywhere else: guards that run over every *page* at
// once, and a sweep of every internal link on the site.

const PAGES = ['index.html', 'projects.html', 'music.html', 'workshop.html', 'projects/cache-it.html'];

describe.each(PAGES)('%s', (page) => {
  const html = readFileSync(page, 'utf8');

  it('declares a room', () => {
    expect(html).toMatch(/<body[^>]*data-room="(home|projects|music|workshop)"/);
  });

  it('carries no banned copy', () => {
    expect(findForbiddenCopy(html)).toEqual([]);
  });

  it('has exactly one h1', () => {
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
  });

  it('labels every image frame', () => {
    const frames = html.match(/<figure class="frame[^"]*"[^>]*>/g) ?? [];
    frames.forEach((f) => expect(f).toContain('data-label='));
  });

  it('gives every external link rel="noopener"', () => {
    const external = html.match(/<a[^>]*target="_blank"[^>]*>/g) ?? [];
    external.forEach((a) => expect(a).toContain('rel="noopener"'));
  });

  it('invents no metrics', () => {
    expect(html).not.toMatch(/\b\d+x\s+faster\b/i);
    expect(html).not.toMatch(/99\.\d+%\s*uptime/i);
    expect(html).not.toMatch(/lorem ipsum/i);
  });
});

describe('internal links', () => {
  it('points only at pages that exist', () => {
    const known = new Set(['/', '/index.html', '/projects.html', '/music.html', '/workshop.html', '/projects/cache-it']);
    for (const page of PAGES) {
      const html = readFileSync(page, 'utf8');
      const hrefs = Array.from(html.matchAll(/href="(\/[^"#?]*)/g)).map((m) => m[1]);
      for (const href of hrefs) {
        if (href.startsWith('/assets') || href.startsWith('/src')) continue;
        expect(known.has(href), `${page} links to ${href}`).toBe(true);
      }
    }
  });
});
