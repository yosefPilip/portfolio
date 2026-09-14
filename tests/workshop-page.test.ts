import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { findForbiddenCopy } from '../src/lib/guards';

const html = readFileSync('workshop.html', 'utf8');

describe('workshop.html', () => {
  it('declares the workshop room', () => {
    expect(html).toMatch(/<body[^>]*data-room="workshop"/);
  });

  it('runs the three RE— acts in order', () => {
    const acts = Array.from(html.matchAll(/data-act="(\w+)"/g)).map((m) => m[1]);
    expect(acts).toEqual(['rescue', 'renew', 'resell']);
  });

  it('sets each act as RE with a changing suffix', () => {
    expect(html).toContain('>Re</span><span class="act__suffix">scue<');
    expect(html).toContain('>Re</span><span class="act__suffix">new<');
    expect(html).toContain('>Re</span><span class="act__suffix">sell<');
  });

  it('carries the manufacturing background', () => {
    expect(html).toContain('SolidWorks');
    expect(html).toContain('CNC');
    expect(html).toContain('powder-bed fusion');
  });

  it('links across to the Resell Assistant project', () => {
    expect(html).toContain('/projects.html#resell-assistant');
  });

  it('marks every before/after shot as a photograph the owner took', () => {
    const shots = html.match(/<figure class="frame ba__shot"[^>]*>/g) ?? [];
    expect(shots).toHaveLength(5); // piece 1: before/during/after; piece 2: before/after
    shots.forEach((f) => expect(f).toContain('data-own-photo="true"'));
  });

  it('points every shot at a file that actually exists', () => {
    const srcs = Array.from(html.matchAll(/src="(\/assets\/img\/workshop\/[^"]+)"/g)).map((m) => m[1]);
    expect(srcs).toHaveLength(5);
    srcs.forEach((src) => expect(existsSync(`.${src}`)).toBe(true));
  });

  it('gives every workshop photo real alt text — they are the page evidence', () => {
    const imgs = html.match(/<img src="\/assets\/img\/workshop\/[^>]*>/g) ?? [];
    imgs.forEach((img) => {
      const alt = img.match(/alt="([^"]*)"/);
      expect(alt).not.toBeNull();
      expect(alt![1].length).toBeGreaterThan(10);
    });
  });

  // CONTROLLER CORRECTION C1 (supersedes the original plan): the owner said,
  // verbatim, "drop for now. I can add later." about eBay and Mercari. A
  // visible "—" on this site means "unknown and coming" (spec §14/§15) — these
  // are not unknown, they're withheld, so a dash would misreport his own
  // decision. They ship as nothing: no dash, no <span class="meta">, no
  // <!-- OPEN: --> comment. Only the real Depop link remains in the shop row.
  //
  // Scoped to .workshop__shops specifically, not the whole document — the Act
  // 3 prose paragraph legitimately still names all three platforms ("Depop,
  // eBay, Mercari, depending on what it is"), which is a true statement about
  // how he sells (spec §8.4) and stays untouched. Checking the whole `html`
  // string for the absence of "eBay" would fail on that sentence for the
  // wrong reason; checking only the shop-links block is the real assertion.
  it('links the real Depop shop only — eBay and Mercari are dropped, not dashed', () => {
    const shopsBlock = html.match(/<p class="workshop__shops">([\s\S]*?)<\/p>/);
    expect(shopsBlock).not.toBeNull();
    const shops = shopsBlock![1];

    expect(shops).toContain('depop.com/explosef');

    // Exactly one link in the row — Depop alone. Guards against the block
    // being emptied out entirely for the wrong reason (that would also make
    // the "does not appear" checks below pass vacuously).
    expect(shops.match(/<a\b/g)).toHaveLength(1);

    expect(shops).not.toMatch(/eBay/);
    expect(shops).not.toMatch(/Mercari/);
    expect(shops).not.toMatch(/<!--\s*OPEN/);
    expect(shops).not.toMatch(/class="meta"/);
    expect(shops).not.toMatch(/&mdash;|—/); // no honest-dash placeholder either
  });

  it('carries no banned copy', () => {
    expect(findForbiddenCopy(html)).toEqual([]);
  });
});
