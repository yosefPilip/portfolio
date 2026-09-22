import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findHardcodedHex } from '../src/lib/guards';
import { STYLESHEETS } from './stylesheets';

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

// ── the negative-tracking guard (spec §4) ──────────────────────────────────
//
// "Display text ≥32px always gets negative tracking. Skipping either is the
// most reliable tell of machine-generated type."
//
// This is a pragmatic scanner, not a CSS parser. It resolves the --step-*
// custom properties out of tokens.css so `font-size: var(--step-h2)` is seen
// for the 44px it can reach, then asserts every rule that can render at ≥32px
// carries tracking — negative for normal-case display type, positive for
// all-caps, which is the other half of the same spec rule.

const tokensCss = readFileSync('src/styles/tokens.css', 'utf8');

/** `--step-h2` → `clamp(28px, 3.4vw, 44px)`, read straight out of `:root`. */
const STEPS = new Map<string, string>();
for (const [, name, value] of tokensCss.matchAll(/(--step-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
  STEPS.set(name, value.trim());
}

/**
 * The largest px this value can ever render at, or null when it is expressed
 * only in relative units we cannot resolve statically (vw, em, %).
 *
 * A `clamp(min, pref, max)` is bounded by its max, and the max is the largest
 * px literal in the expression — so taking the biggest px literal is both
 * correct here and far more readable than parsing clamp arguments.
 */
function maxRenderedPx(rawValue: string): number | null {
  let value = rawValue.trim();
  // Resolve one level of var(--step-*); nothing in this project nests deeper.
  value = value.replace(/var\(\s*(--step-[a-z0-9-]+)\s*\)/g, (whole, name: string) =>
    STEPS.get(name) ?? whole,
  );
  const pxLiterals = [...value.matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  if (pxLiterals.length === 0) return null;
  return Math.max(...pxLiterals);
}

interface Rule {
  file: string;
  selector: string;
  body: string;
}

/**
 * Every `selector { declarations }` pair in a stylesheet, including rules
 * nested inside `@media` blocks — the inner braces mean a media prelude can
 * never itself match, so nested rules are picked up on their own.
 */
function rules(file: string): Rule[] {
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    file,
    selector: selector.trim(),
    body,
  }));
}

const ALL_RULES = STYLESHEETS.flatMap(rules);

/** Individual selectors (comma-split) that are given negative tracking anywhere. */
const NEGATIVELY_TRACKED = new Set<string>();
for (const rule of ALL_RULES) {
  if (!/letter-spacing:\s*-/.test(rule.body)) continue;
  for (const selector of rule.selector.split(',')) NEGATIVELY_TRACKED.add(selector.trim());
}

describe('display type ≥32px carries tracking (spec §4)', () => {
  it('finds the type scale in tokens.css, or the whole scan is vacuous', () => {
    expect(STEPS.get('--step-h2')).toBe('clamp(28px, 3.4vw, 44px)');
    expect(maxRenderedPx('var(--step-h2)')).toBe(44);
    expect(maxRenderedPx('15px')).toBe(15);
    expect(maxRenderedPx('22vw')).toBeNull();
  });

  it('scans more than one stylesheet', () => {
    expect(STYLESHEETS.length).toBeGreaterThan(1);
    expect(ALL_RULES.length).toBeGreaterThan(20);
  });

  it('gives every rule that can render at ≥32px the tracking the spec demands', () => {
    const offenders: string[] = [];

    for (const rule of ALL_RULES) {
      const declared = rule.body.match(/(?:^|[;{\s])font-size:\s*([^;]+)/);
      if (!declared) continue;
      const px = maxRenderedPx(declared[1]);
      if (px === null || px < 32) continue;

      // All-caps is the other half of the same spec rule: ≥0.06em POSITIVE.
      if (/text-transform:\s*uppercase/.test(rule.body)) {
        const caps = rule.body.match(/letter-spacing:\s*(0?\.\d+)em/);
        if (!caps || Number(caps[1]) < 0.06) {
          offenders.push(`${rule.file} — ${rule.selector} (${px}px, all-caps, needs ≥0.06em)`);
        }
        continue;
      }

      const trackedHere = /letter-spacing:\s*-/.test(rule.body);
      const trackedElsewhere = rule.selector
        .split(',')
        .every((s) => NEGATIVELY_TRACKED.has(s.trim()));
      if (!trackedHere && !trackedElsewhere) {
        offenders.push(`${rule.file} — ${rule.selector} (${px}px, needs negative letter-spacing)`);
      }
    }

    expect(offenders).toEqual([]);
  });
});

// ── the colour and motion guards (spec §15) ────────────────────────────────
//
// These run over EVERY stylesheet, not a hand-written list. Spec §15 states the
// rules sitewide — "zero hardcoded hex elsewhere", "only transform and opacity
// animate" — so the guards have to be sitewide too, or a stylesheet is only
// covered for as long as somebody remembers to add it here.

describe.each(STYLESHEETS)('%s', (file) => {
  const css = readFileSync(file, 'utf8');

  it('has balanced braces, so the browser does not drop the whole file', () => {
    /* A stylesheet with one stray '}' does not fail loudly — the browser
       discards from the error onward and the page renders unstyled, which on
       workshop.css meant a 200px photo rail rendering at 13,000px tall while
       every test still passed. Cheap check, and it would have caught it at
       the moment the edit was made. */
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const open = (withoutComments.match(/\{/g) ?? []).length;
    const close = (withoutComments.match(/\}/g) ?? []).length;
    expect(close, `${open} '{' vs ${close} '}'`).toBe(open);
  });

  it('contains no colour literals — every colour comes from a token', () => {
    expect(findHardcodedHex(css)).toEqual([]);
  });

  it('uses no pure black or pure white', () => {
    expect(css).not.toMatch(/#000\b|#000000\b|#fff\b|#ffffff\b/);
  });

  it('does not animate expensive layout properties', () => {
    const bannedProps = /\b(top|left|right|bottom|background-position|width|height)\b/;

    // transition: and transition-property: declarations
    for (const t of css.match(/transition(?:-property)?:[^;]+;/g) ?? []) {
      expect(t, `${file}: ${t}`).not.toMatch(bannedProps);
    }

    // animation: and animation-name: declarations
    for (const a of css.match(/animation(?:-name)?:[^;]+;/g) ?? []) {
      expect(a, `${file}: ${a}`).not.toMatch(bannedProps);
    }

    // @keyframes bodies, for banned property names in any stop (e.g. "top:")
    for (const kf of extractKeyframesBodies(css)) {
      expect(kf, file).not.toMatch(
        /\b(top|left|right|bottom|background-position|width|height)\s*:/,
      );
    }
  });
});

describe('base.css', () => {
  it('gives all-caps classes at least 0.06em tracking', () => {
    const caps = base.match(/\.eyebrow(?![a-zA-Z0-9_-])[^{]*\.meta(?![a-zA-Z0-9_-])[^{]*\{[^}]*\}/g);
    expect(caps).not.toBeNull();
    expect(caps!.join('')).toMatch(/letter-spacing:\s*0\.1em/);
  });
});
