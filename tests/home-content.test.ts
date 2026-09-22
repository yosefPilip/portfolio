import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { NOW_LINES } from '../src/data/now';

const html = readFileSync('index.html', 'utf8');

/** Character offset of a section, so order can be asserted without a parser. */
const at = (id: string): number => html.indexOf(`id="${id}"`);

describe('Home content', () => {
  it('has all its body sections', () => {
    for (const id of ['about', 'work', 'elsewhere', 'experience', 'contact']) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('puts the doors to the other rooms ABOVE the experience block', () => {
    // The point of the reorder, and the thing most likely to be undone by
    // accident: #elsewhere is the only pointer on this page to Music and
    // Workshop, and behind four jobs it never got read.
    expect(at('elsewhere')).toBeGreaterThan(at('work'));
    expect(at('elsewhere')).toBeLessThan(at('experience'));
  });

  it('keeps the Now corner inside the hero, not in the page flow', () => {
    // It moved into the hero's bottom-right on the owner's call. Living in
    // the .stack-view is what makes it hero furniture rather than a band the
    // page has to make room for.
    const hero = html.slice(at('hero'), at('about'));
    expect(hero).toContain('class="hero-now"');
    expect(hero).toContain('data-now');
    expect(html.indexOf('hero-now')).toBeLessThan(at('about'));
  });

  it('ships a real first line in the Now corner, for the no-JS path', () => {
    // The closing tag is split across lines in the markup to kill the
    // whitespace between the text and the caret, so match `</span` not `</span>`.
    const span = html.match(/<span class="hero-now__text" data-now>([^<]+)<\/span/);
    expect(span, 'the [data-now] span the ticker drives').not.toBeNull();
    expect(span![1].trim().length).toBeGreaterThan(0);
    // It has to be one of the real lines, not stale copy left behind when the
    // list was edited — the strip would otherwise flash a line that no longer
    // exists before the first tick replaces it.
    expect(NOW_LINES).toContain(span![1].trim());
  });

  it('gives the ticker enough lines to be a ticker', () => {
    expect(NOW_LINES.length).toBeGreaterThanOrEqual(2);
    for (const line of NOW_LINES) {
      expect(line.trim(), 'a blank line would type nothing and hold').not.toBe('');
      /* The corner is a single line at 390px, and a wrap grows it upward
         into the hero copy mid-type. Measured in the browser at 390px: 40
         characters render 267px against ~277px of usable width, so the real
         ceiling is ~41. */
      expect(line.length, `"${line}" is too long for the mobile strip`).toBeLessThanOrEqual(41);
    }
  });

  it('serves the doors real thumbnails, not the deleted life-* slots', () => {
    for (const room of ['projects', 'music', 'workshop']) {
      expect(html).toContain(`/assets/img/door-${room}.webp`);
      expect(existsSync(`assets/img/door-${room}.webp`)).toBe(true);
    }
    // life-build/decks/rack were never generated; referencing them again is
    // how the bottom of this page ended up as three dashed boxes.
    expect(html).not.toContain('life-build');
    expect(html).not.toContain('life-decks');
    expect(html).not.toContain('life-rack');
  });


  it('carries the résumé metrics verbatim', () => {
    expect(html).toContain('$8,000');
    expect(html).toContain('40 hours a month');
    expect(html).toContain('same-day');
    expect(html).toContain('$12,000');
  });

  it('has no seam stacks — the owner removed them', () => {
    // Two half-height type bands sat between the sections here. The owner
    // read them as filler: "they sound weird, remove them". A future pass
    // wanting a beat between chapters should use an image, not this.
    expect(html).not.toContain('class="stack seam"');
    expect(readFileSync('src/styles/stack.css', 'utf8')).not.toContain('.seam');
  });

  it("keeps the owner's punctuation rules out of the prose", () => {
    /* "no m dahses, no colons. my voice." — 2026-09-22. Checked against the
       rendered TEXT, not the source, so attributes and entity names are not
       what is being scanned. En dashes stay: they are range marks (Aug 2024
       – Jun 2028), not the dash he means. */
    const prose = html
      // <style>/<script> bodies survive a naive tag strip and are full of
      // colons that are not prose.
      .replace(/<(?:style|script)[\s\S]*?<\/(?:style|script)>/g, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&middot;/g, '·')
      .replace(/&rsquo;/g, '’')
      .replace(/&amp;/g, '&');

    expect(prose).not.toContain('—');
    expect(html).not.toContain('&mdash;');

    // A colon in prose. Time-of-day and URLs would be false positives, so
    // they are excused explicitly rather than by loosening the rule.
    const colons = prose
      .replace(/https?:\/\//g, '')
      .replace(/\d:\d/g, '')
      .match(/[^\s][:]/g);
    expect(colons, `colons in Home prose: ${colons?.join(', ')}`).toBeNull();
  });

  it('features Cache It as a portal, with the live app as the first action', () => {
    /* "cache it should have the website almost first things first as the
       link, short description, then link to case study." The order below is
       the brief, and it is the thing most likely to be undone by a later
       tidy-up that moves the description above the button. */
    expect(html).toContain('class="portal reveal"');

    const card = html.slice(html.indexOf('class="portal reveal"'), html.indexOf('</article>'));
    const liveApp = card.indexOf('cache-it-one.vercel.app');
    const hook = card.indexOf('portal__hook');
    const caseStudy = card.indexOf('/projects/cache-it');

    expect(liveApp, 'the live app link').toBeGreaterThan(-1);
    expect(liveApp).toBeLessThan(hook);
    expect(hook).toBeLessThan(caseStudy);

    // It leaves the site, so it needs the same treatment as every other
    // outbound link here.
    expect(card).toMatch(/href="https:\/\/cache-it-one\.vercel\.app"[^>]*rel="noopener"/);
  });

  it('no longer lists three projects Home does not own', () => {
    // Replaced by the single featured portal; the Projects page owns the list.
    expect(html).not.toContain('work-row');
    expect(html).not.toContain('Batch Podcast Generator');
  });

  it('uses the correct email', () => {
    expect(html).toContain('yosefpilip@gmail.com');
    expect(html).not.toContain('hello@yosefpilip.com');
  });

  it('drops the roles and claims the résumé does not support', () => {
    expect(html).not.toContain('Aztec Robotics');
    expect(html).not.toContain('Russian — Native');
    expect(html).not.toContain('Apali');
  });

  it('publishes the city — the owner reversed the earlier decision', () => {
    // Owner, later: "You can add city if you want. Just say Bay Area and San
    // Diego or something because I'm in both." The row is back, with a value.
    expect(html).toMatch(/<dt[^>]*>Based<\/dt>\s*<dd[^>]*>Bay Area &amp; San Diego<\/dd>/);
  });
});
