import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/stack.css', 'utf8');

/**
 * `.plate` gets `inset: -12% -3%` — a PERCENTAGE-of-viewport overscan (108px
 * at a 900px viewport). Parallax travel is `--p * --rate * 1px`, a PIXEL
 * quantity. Percentage overscan and pixel travel are not commensurable: any
 * plate whose |--rate| exceeds the overscan rides its own bottom edge into
 * the viewport, exposing a bare strip of nothing — the "black box, underside
 * of the images" the owner reported. Measured bare strip at full scroll,
 * 1440x900: fog 11px, mid 80px, name 140px, near 239px, low 328px.
 *
 * The fix extends the PAINTED surface (the frame, and the hero gradient's
 * ::after) downward by the travel, leaving the plate's LAYOUT BOX untouched
 * — growing the plate itself would drop the grid-centred wordmark/copy
 * ~125px below viewport centre (plate--name, plate--copy use
 * `place-content: center`).
 */

const OVERSCAN_PX_AT_900 = 900 * 0.12; // inset: -12% of viewport height

function heroRates(source: string): { name: string; rate: number }[] {
  const rules = source.matchAll(/\.hero \.plate--(\w+)\s*\{[^}]*--rate:\s*(-?\d+)/g);
  return Array.from(rules, (m) => ({ name: m[1], rate: Number(m[2]) }));
}

describe('plate painted-surface coverage', () => {
  it('sizes the frame to compensate --rate, not a bare height: 100%', () => {
    const rule = css.match(/\.plate\s*>\s*\.frame\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    const body = rule![1];
    // Still full width, still lets object-fit: cover do the fitting.
    expect(body).toMatch(/width:\s*100%/);
    expect(body).toMatch(/aspect-ratio:\s*auto/);
    // The height must reference --rate to extend the painted surface by the
    // travel. A bare `height: 100%` (no --rate reference) is exactly the bug:
    // the frame stops at the plate's layout box and the travel rides past it.
    const heightDecl = body.match(/height:\s*([^;]+);/);
    expect(heightDecl).not.toBeNull();
    expect(heightDecl![1]).toMatch(/var\(--rate/);
    expect(heightDecl![1].trim()).not.toBe('100%');
  });

  it('extends the hero fog/low gradient bottom by --rate, not a bare inset: 0', () => {
    const rule = css.match(
      /\.hero \.plate--fog::after,\s*\n\.hero \.plate--low::after\s*\{([^}]*)\}/,
    );
    expect(rule).not.toBeNull();
    const body = rule![1];
    const insetDecl = body.match(/inset:\s*([^;]+);/);
    expect(insetDecl).not.toBeNull();
    // A bare `inset: 0` stops the gradient at the plate's layout box, exactly
    // like the frame bug above. The bottom offset must reference --rate.
    expect(insetDecl![1]).toMatch(/var\(--rate/);
    expect(insetDecl![1].replace(/\s+/g, ' ').trim()).not.toBe('0');
  });

  it('documents WHY compensation is required: travel exceeds the 108px overscan', () => {
    // If someone later shrinks every hero --rate below the overscan and
    // deletes the compensation as "dead", this fails loudly.
    const layers = heroRates(css);
    expect(layers.length).toBeGreaterThan(0);
    const exceedsOverscan = layers.some((l) => Math.abs(l.rate) > OVERSCAN_PX_AT_900);
    expect(exceedsOverscan).toBe(true);
  });
});
