import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/stack.css', 'utf8');

const MOBILE = /@media \(max-width: 744px\) \{([\s\S]*?)\n\}/;

interface PlateDecl {
  scope: string;
  name: string;
  z: number | null;
  rate: number | null;
  zoom: number | null;
}

/**
 * Every `<scope> .plate--<name> { … }` rule that declares at least one depth
 * property. The scope is the selector text to the left of `.plate--`, with an
 * empty string meaning the base body stack (`.plate--back/--copy/--front`).
 *
 * Extracting that scope needs more care than it looks. `([^{}]*?)` is lazy,
 * but the match START is still the earliest position where the whole pattern
 * can match — which is right after the previous rule's `}`. So group 1
 * swallows every comment and blank line in between, and a naive
 * `.split(',').pop()` hands back `"/* Body stacks: three plates. *\/"` as the
 * scope of `.plate--back`. That was measured against the real stylesheet, not
 * imagined: it put `--back` and `--fog` in invented single-member groups,
 * which makes the `has('')` canary fail and lets the contiguity check pass
 * vacuously on garbage.
 *
 * Stripping comments and splitting on newline as well as comma fixes it: a
 * selector always sits on the same line as the `.plate--x` it qualifies.
 * Verified to yield "" x3 and ".hero" x6 against stack.css as it stands.
 */
function parsePlates(source: string): PlateDecl[] {
  const out: PlateDecl[] = [];
  for (const m of source.matchAll(/([^{}]*?)\.plate--([a-z]+)\s*\{([^}]*)\}/g)) {
    const body = m[3];
    const z = body.match(/z-index:\s*(\d+)/);
    const rate = body.match(/--rate:\s*(-?\d+)/);
    const zoom = body.match(/--zoom:\s*([\d.]+)/);
    if (!z && !rate && !zoom) continue;
    out.push({
      scope: m[1].replace(/\/\*[\s\S]*?\*\//g, '').split(/[,\n]/).pop()!.trim(),
      name: m[2],
      z: z ? Number(z[1]) : null,
      rate: rate ? Number(rate[1]) : null,
      zoom: zoom ? Number(zoom[1]) : null,
    });
  }
  return out;
}

function groupByScope(decls: PlateDecl[]): Map<string, PlateDecl[]> {
  const groups = new Map<string, PlateDecl[]>();
  for (const d of decls) {
    const list = groups.get(d.scope) ?? [];
    list.push(d);
    groups.set(d.scope, list);
  }
  return groups;
}

const desktop = groupByScope(parsePlates(css.replace(MOBILE, '')));
const mobile = groupByScope(parsePlates(css.match(MOBILE)?.[1] ?? ''));

describe('stack depth ordering', () => {
  it('finds every stack scope, not just the hero', () => {
    // A broken regex would silently shrink this to one group and every
    // assertion below would pass vacuously. This is the canary.
    expect(desktop.size).toBeGreaterThanOrEqual(2);
    expect(desktop.has('')).toBe(true);
    expect(desktop.has('.hero')).toBe(true);
  });

  it('gives every depth-declaring plate both a z-index and a rate', () => {
    for (const [scope, plates] of desktop) {
      for (const p of plates) {
        expect(p.z, `${scope} .plate--${p.name} z-index`).not.toBeNull();
        expect(p.rate, `${scope} .plate--${p.name} --rate`).not.toBeNull();
      }
    }
  });

  it('numbers each scope z 1..n with no gap and no collision', () => {
    // An incomplete scope is the real bug this catches: inserting one plate
    // into a stack without restating the plates it displaces leaves two
    // layers sharing a z-index, and paint order silently falls back to DOM
    // order.
    for (const [scope, plates] of desktop) {
      const zs = plates.map((p) => p.z!).sort((a, b) => a - b);
      expect(zs, `scope "${scope}"`).toEqual(zs.map((_, i) => i + 1));
    }
  });

  it('moves nearer layers faster, in every scope, without exception', () => {
    for (const [scope, plates] of desktop) {
      const byDepth = [...plates].sort((a, b) => a.z! - b.z!);
      for (let i = 1; i < byDepth.length; i += 1) {
        expect(
          Math.abs(byDepth[i].rate!),
          `${scope} .plate--${byDepth[i].name} vs --${byDepth[i - 1].name}`,
        ).toBeGreaterThan(Math.abs(byDepth[i - 1].rate!));
      }
    }
  });

  it('moves nearer layers faster on mobile too, in every scope', () => {
    for (const [scope, plates] of mobile) {
      const zByName = new Map(
        (desktop.get(scope) ?? []).map((p) => [p.name, p.z!]),
      );
      const byDepth = [...plates].sort(
        (a, b) => zByName.get(a.name)! - zByName.get(b.name)!,
      );
      expect(byDepth.every((p) => zByName.has(p.name)), `scope "${scope}"`).toBe(true);
      for (let i = 1; i < byDepth.length; i += 1) {
        expect(
          Math.abs(byDepth[i].rate!),
          `mobile ${scope} .plate--${byDepth[i].name}`,
        ).toBeGreaterThan(Math.abs(byDepth[i - 1].rate!));
      }
    }
  });

  it('scales nearer image layers at least as fast, never slower', () => {
    // Non-decreasing, not strictly increasing, and two exceptions are
    // deliberate (spec §6):
    //   - a door is IN its doorway, so --face and --door are coplanar and
    //     share a --zoom; give the door its own depth and it drifts off the
    //     opening as the dolly runs.
    //   - --copy is type, not world geometry. Type never scales; --step-*
    //     already sizes it. It is skipped entirely.
    for (const [scope, plates] of desktop) {
      const zoomed = plates
        .filter((p) => p.name !== 'copy' && p.zoom !== null)
        .sort((a, b) => a.z! - b.z!);
      for (let i = 1; i < zoomed.length; i += 1) {
        expect(
          zoomed[i].zoom!,
          `${scope} .plate--${zoomed[i].name} vs --${zoomed[i - 1].name}`,
        ).toBeGreaterThanOrEqual(zoomed[i - 1].zoom!);
      }
    }
  });

  it('never puts a blend mode on a .frame — it belongs on the .plate', () => {
    // The hero's own plates no longer multiply at all: both foliage layers
    // carry real alpha mattes, because multiply made solid broad leaves look
    // see-through and the owner rejected it twice. Other rooms still multiply,
    // so the rule that matters is unchanged and still worth pinning: a blend
    // on the .frame composites only inside its own plate's stacking context
    // (the .plate sets will-change: transform) and silently does nothing.
    expect(css).not.toMatch(/\.plate--\w+ \.frame \{[^}]*mix-blend-mode/);
  });

  it('keeps no alpha-era mask on the hero', () => {
    expect(css).not.toMatch(/\.hero \.plate--\w+ \{[\s\S]{0,200}mask-image/);
  });
});
