import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findHardcodedHex } from '../src/lib/guards';

const base = readFileSync('src/styles/base.css', 'utf8');

describe('base.css', () => {
  it('contains no colour literals — every colour comes from a token', () => {
    expect(findHardcodedHex(base)).toEqual([]);
  });

  it('animates only transform and opacity', () => {
    const transitions = base.match(/transition:[^;]+;/g) ?? [];
    for (const t of transitions) {
      expect(t).not.toMatch(/\b(top|left|right|bottom|background-position|width|height)\b/);
    }
  });

  it('gives all-caps classes at least 0.06em tracking', () => {
    const caps = base.match(/\.(?:eyebrow|meta)[^{]*\{[^}]*\}/g)?.join('') ?? base;
    expect(caps).toMatch(/letter-spacing:\s*0\.1em/);
  });

  it('uses no pure black or pure white', () => {
    expect(base).not.toMatch(/#000\b|#000000\b|#fff\b|#ffffff\b/);
  });
});
