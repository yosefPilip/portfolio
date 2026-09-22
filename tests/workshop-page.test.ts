import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { findForbiddenCopy } from '../src/lib/guards';

const html = readFileSync('workshop.html', 'utf8');

// Pulls one <section id="X">...</section> block out of the page so the
// stack-shape assertions below can look inside just that stack, not the
// whole document. workshop.html never nests one <section> inside another,
// so a non-greedy match to the first closing tag is safe.
function sectionById(id: string): string {
  const match = html.match(new RegExp(`<section[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?<\\/section>`));
  expect(match, `expected a <section id="${id}"> in workshop.html`).not.toBeNull();
  return match![0];
}

describe('workshop.html', () => {
  it('declares the workshop room', () => {
    expect(html).toMatch(/<body[^>]*data-room="workshop"/);
  });

  // ADDED for the exterior-then-interior restructure (Task 3). The old
  // single-hero shape had no assertions of its own in this file — see
  // CONTROLLER RULING 3 — so nothing above or below this block is being
  // replaced, only added to.
  it('opens on ONE continuous stack, outside to inside', () => {
    // This used to be two stacks. The dolly landed you inside the shop and
    // the very next stack showed the same room again, which reads as "enter,
    // then scroll to the real interior" instead of as arriving. #inside was
    // merged into #arrive; its headline is now the last beat of the same move.
    expect(html).toContain('id="arrive"');
    expect(html).not.toContain('id="inside"');
    expect(Array.from(html.matchAll(/<section class="stack/g))).toHaveLength(1);
  });

  it("carries the page's single <h1> and the interior <h2> in that one stack", () => {
    const arrive = sectionById('arrive');
    expect(arrive).toMatch(/<h1[\s>]/);
    expect(Array.from(html.matchAll(/<h1[\s>]/g))).toHaveLength(1);
    expect(arrive).toMatch(/class="plate plate--threshold"[\s\S]*?<h2[\s>]/);
  });

  it('runs the arrival as back, copy, front, then the threshold beat', () => {
    const arrive = sectionById('arrive');
    const plates = Array.from(
      arrive.matchAll(/class="plate plate--(back|copy|front|threshold)"/g),
    ).map((m) => m[1]);
    // Order is load-bearing: the threshold headline must come last so it sits
    // above the room rather than behind the doorframe it arrives through.
    expect(plates).toEqual(['back', 'copy', 'front', 'threshold']);
  });

  it('references every image slot the arrival needs', () => {
    // cottage-far was replaced by cottage-face when the doorway dolly landed:
    // the facade needs a real opening with no door painted in it, and
    // cottage-door is the slab that swings out of that opening. bench-near is
    // deleted — under multiply over a lit bench its clutter rendered
    // semi-transparent and read as a smear rather than as foreground.
    ['cottage-face', 'cottage-door', 'needles-near', 'bench-far'].forEach((slug) => {
      expect(html).toContain(`/assets/img/${slug}.webp`);
    });
  });

  it('keeps the dolly nested inside the back plate, not as extra plates', () => {
    // The facade, the opening and the door are one plane. If they ever become
    // sibling plates they need three --rate values kept in sync and the door
    // slides off its hole; the three-plate test above would also start failing
    // for a reason that looks unrelated. Pin the structure here instead.
    const arrive = sectionById('arrive');
    expect(arrive).toMatch(/class="plate plate--back"[\s\S]*?class="face"/);
    expect(arrive).toMatch(/class="face"[\s\S]*?class="doorway"[\s\S]*?class="doorway__hold"/);
    expect(arrive).toMatch(/class="frame door"/);
  });

  it('runs the three RE— acts in order', () => {
    const acts = Array.from(html.matchAll(/data-act="(\w+)"/g)).map((m) => m[1]);
    expect(acts).toEqual(['rescue', 'renew', 'resell']);
  });

  it('sets each act as RE with a changing suffix', () => {
    // Attribute-tolerant between the class and the `>`: the suffix span now also
    // carries the visual editing panel's data-edit id. The split itself — "Re"
    // immediately followed by its suffix span — is still asserted exactly.
    for (const suffix of ['scue', 'new', 'sell']) {
      expect(html, suffix).toMatch(
        new RegExp(`>Re</span><span [^>]*class="act__suffix"[^>]*>${suffix}<`),
      );
    }
  });

  it('carries the manufacturing background', () => {
    expect(html).toContain('SolidWorks');
    expect(html).toContain('CNC');
    expect(html).toContain('powder-bed fusion');
  });

  it('links across to the Resell Assistant project', () => {
    expect(html).toContain('/projects.html#resell-assistant');
  });

  it('marks every shot as a photograph the owner took', () => {
    // The grid became a rail (2026-09-22), which had room for all nine shots
    // rather than the five the full-width layout could afford.
    const shots = html.match(/<figure class="frame rail__shot"[^>]*>/g) ?? [];
    expect(shots).toHaveLength(9);
    shots.forEach((f) => expect(f).toContain('data-own-photo="true"'));
  });

  it('points every shot at a file that actually exists', () => {
    const srcs = Array.from(html.matchAll(/src="(\/assets\/img\/workshop\/[^"]+)"/g)).map((m) => m[1]);
    expect(srcs).toHaveLength(9);
    // These are the owner's own photographs; a broken path here is the one
    // kind of missing image the designed placeholder must never stand in for.
    srcs.forEach((src) => expect(existsSync(`.${src}`)).toBe(true));
  });

  it('keeps the rail usable with no JS', () => {
    // The track is a plain scroll container; the arrows are an enhancement
    // and must ship hidden, or a no-JS visitor gets two dead buttons.
    expect(html).toMatch(/<div class="rail__arrows" hidden>/);
    expect(html).toContain('data-rail-track');
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
