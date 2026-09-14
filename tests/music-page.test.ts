import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findForbiddenCopy } from '../src/lib/guards';

const html = readFileSync('music.html', 'utf8');
const css = readFileSync('src/styles/coverflow.css', 'utf8');

describe('music.html', () => {
  it('declares the music room', () => {
    expect(html).toMatch(/<body[^>]*data-room="music"/);
  });

  it('keeps the coverflow mount point — the island is not rebuilt', () => {
    expect(html).toContain('id="coverflow-root"');
  });

  it('uses a three-layer cave hero, not the six-layer one', () => {
    expect(html).toContain('plate--back');
    expect(html).toContain('plate--front');
    expect(html).not.toContain('plate--trunks');
  });

  it('carries the real links', () => {
    expect(html).toContain('soundcloud.com/recursion-mp3');
    expect(html).toContain('instagram.com/recursion.mp3');
  });

  it('carries no banned copy', () => {
    expect(findForbiddenCopy(html)).toEqual([]);
  });
});

describe('coverflow.css', () => {
  // findHardcodedHex / the a4d64c check are already asserted for every
  // src/styles/*.css file (coverflow.css included) by tests/islands-css.test.ts,
  // which sweeps tests/stylesheets.ts's enumeration. Re-asserting them here
  // would duplicate that logic block. What is NOT guarded anywhere else is the
  // shadow-as-light rule (spec §4): no box-shadow with a non-zero blur radius.
  it('has no shadow used as a light source — no glow, only the flat focus ring', () => {
    const offenders: string[] = [];

    for (const match of css.matchAll(/box-shadow:\s*([^;]+);/g)) {
      const declaration = match[1];

      // Split on top-level commas only — color-mix(a, b, c) commas must not
      // be mistaken for separators between multiple stacked shadows.
      const shadows: string[] = [];
      let depth = 0;
      let current = '';
      for (const ch of declaration) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (ch === ',' && depth === 0) {
          shadows.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      shadows.push(current);

      for (const shadow of shadows) {
        // A shadow is `[inset] h v blur [spread] color`. The third length
        // value is the blur radius; anything non-zero there is a soft glow.
        const lengths = [...shadow.matchAll(/(-?[\d.]+)px/g)].map((m) => Number(m[1]));
        const blur = lengths[2] ?? 0;
        if (blur !== 0) offenders.push(`${declaration.trim()} (blur ${blur}px)`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
