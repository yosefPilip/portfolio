import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findHardcodedHex } from '../src/lib/guards';

const base = readFileSync('src/styles/base.css', 'utf8');

describe('base.css', () => {
  it('contains no colour literals — every colour comes from a token', () => {
    expect(findHardcodedHex(base)).toEqual([]);
  });

  it('does not animate expensive layout properties', () => {
    const bannedProps = /\b(top|left|right|bottom|background-position|width|height)\b/;

    // Check transition: declarations
    const transitions = base.match(/transition:[^;]+;/g) ?? [];
    for (const t of transitions) {
      expect(t).not.toMatch(bannedProps);
    }

    // Check transition-property: declarations
    const transitionProps = base.match(/transition-property:[^;]+;/g) ?? [];
    for (const t of transitionProps) {
      expect(t).not.toMatch(bannedProps);
    }

    // Check animation: and animation-name: declarations
    const animations = base.match(/animation(?:-name)?:[^;]+;/g) ?? [];
    for (const a of animations) {
      expect(a).not.toMatch(bannedProps);
    }

    // Check @keyframes bodies for banned property names (e.g., "top:", "width:")
    const keyframes = base.match(/@keyframes[^{]*\{[^}]*\}/g) ?? [];
    for (const kf of keyframes) {
      expect(kf).not.toMatch(/\b(top|left|right|bottom|background-position|width|height)\s*:/);
    }
  });

  it('gives all-caps classes at least 0.06em tracking', () => {
    const caps = base.match(/\.eyebrow(?![a-zA-Z0-9_-])[^{]*\.meta(?![a-zA-Z0-9_-])[^{]*\{[^}]*\}/g);
    expect(caps).not.toBeNull();
    expect(caps!.join('')).toMatch(/letter-spacing:\s*0\.1em/);
  });

  it('uses no pure black or pure white', () => {
    expect(base).not.toMatch(/#000\b|#000000\b|#fff\b|#ffffff\b/);
  });
});
