import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/stack.css', 'utf8');

/**
 * Nearer layers must move faster. This is the invariant that the old
 * `.plate--canopy { --rate: -60 }` violated in spirit: a canopy is overhead,
 * i.e. the nearest thing in frame, yet it carried the slowest rate in the
 * stack. Encoding depth in the names made that visible; this keeps it true.
 */
function heroRates(source: string): { name: string; z: number; rate: number }[] {
  const rules = source.matchAll(
    /\.hero \.plate--(\w+)\s*\{[^}]*z-index:\s*(\d+)[^}]*--rate:\s*(-?\d+)/g,
  );
  return Array.from(rules, (m) => ({ name: m[1], z: Number(m[2]), rate: Number(m[3]) }));
}

/**
 * The `@media (max-width: 744px)` block redeclares `--rate` per plate without
 * redeclaring `z-index` — depth is only ever stated once, in the desktop
 * block above. So a mobile rate is parsed on its own (name + rate, no
 * z-index in scope) and depth is looked up by NAME against the desktop
 * declarations. Without this, the six mobile rates are invisible to
 * `heroRates()` above (it requires both `z-index` and `--rate` in one rule
 * body) and the exact bug this file exists to catch — a plate carrying the
 * wrong rate for its depth — could live in the mobile block undetected.
 */
function mobileHeroRates(source: string): { name: string; rate: number }[] {
  const media = source.match(/@media \(max-width: 744px\) \{([\s\S]*?)\n\}/);
  const body = media?.[1] ?? '';
  const rules = body.matchAll(/\.hero \.plate--(\w+)\s*\{[^}]*--rate:\s*(-?\d+)/g);
  return Array.from(rules, (m) => ({ name: m[1], rate: Number(m[2]) }));
}

describe('hero depth ordering', () => {
  it('declares all six layers with a z-index and a rate', () => {
    const layers = heroRates(css);
    expect(layers.map((l) => l.name)).toEqual([
      'far', 'fog', 'mid', 'name', 'near', 'low',
    ]);
  });

  it('moves nearer layers faster, without exception', () => {
    const layers = heroRates(css);
    const byDepth = [...layers].sort((a, b) => a.z - b.z);
    for (let i = 1; i < byDepth.length; i += 1) {
      expect(Math.abs(byDepth[i].rate)).toBeGreaterThan(Math.abs(byDepth[i - 1].rate));
    }
  });

  it('moves nearer layers faster on mobile too, without exception', () => {
    // Depth is declared once (desktop); the mobile block only redeclares
    // --rate. Look up each mobile plate's depth by name against the desktop
    // z-index before checking the same strict-increase invariant.
    const zByName = new Map(heroRates(css).map((l) => [l.name, l.z]));
    const mobile = mobileHeroRates(css);
    expect(mobile.map((l) => l.name)).toEqual([
      'far', 'fog', 'mid', 'name', 'near', 'low',
    ]);
    const byDepth = [...mobile].sort((a, b) => zByName.get(a.name)! - zByName.get(b.name)!);
    for (let i = 1; i < byDepth.length; i += 1) {
      expect(Math.abs(byDepth[i].rate)).toBeGreaterThan(Math.abs(byDepth[i - 1].rate));
    }
  });

  it('composites the two front plates with multiply, on the plate not the frame', () => {
    // .plate sets will-change: transform, which creates a stacking context, so
    // a blend on the inner .frame silently does nothing.
    expect(css).toMatch(/\.hero \.plate--mid,\s*\n\s*\.hero \.plate--near \{ mix-blend-mode: multiply; \}/);
    expect(css).not.toMatch(/\.hero \.plate--(mid|near) \.frame \{[^}]*mix-blend-mode/);
  });

  it('keeps no alpha-era mask on the hero', () => {
    // The mask existed only to reveal one opaque photograph from behind
    // another. With a single opaque plate it has nothing left to do, and it
    // was the visible seam the owner reported.
    expect(css).not.toMatch(/\.hero \.plate--\w+ \{[\s\S]{0,200}mask-image/);
  });
});
