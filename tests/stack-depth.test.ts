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
