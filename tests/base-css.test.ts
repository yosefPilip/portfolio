import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findHardcodedHex } from '../src/lib/guards';

const base = readFileSync('src/styles/base.css', 'utf8');

/**
 * Extract @keyframes bodies by matching braces, not by naive regex.
 * Handles nested braces correctly and unbalanced blocks.
 */
function extractKeyframesBodies(css: string): string[] {
  const bodies: string[] = [];
  const regex = /@keyframes/g;
  let match;

  while ((match = regex.exec(css)) !== null) {
    const startPos = match.index;
    // Find the opening brace of the @keyframes rule
    const openBracePos = css.indexOf('{', startPos);
    if (openBracePos === -1) continue;

    // Count braces to find the matching closing brace
    let braceDepth = 0;
    let endPos = openBracePos;
    let foundMatchingBrace = false;

    for (let i = openBracePos; i < css.length; i++) {
      if (css[i] === '{') {
        braceDepth++;
      } else if (css[i] === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          endPos = i;
          foundMatchingBrace = true;
          break;
        }
      }
    }

    // Extract the entire @keyframes block (or rest of file if unbalanced)
    const end = foundMatchingBrace ? endPos + 1 : css.length;
    bodies.push(css.substring(startPos, end));
  }

  return bodies;
}

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
    const keyframes = extractKeyframesBodies(base);
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
