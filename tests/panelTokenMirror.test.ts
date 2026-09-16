import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FG, ROOM_BG, ROOM_ACCENT2, STEP_MIN_PX } from '../src/panel/styleControls';
import { MANIFEST } from '../src/panel/manifest';
import { contrastRatio } from '../src/lib/contrast';
import type { ColorKey, StepKey } from '../src/panel/types';

/**
 * styleControls.ts holds hand-copied resolved values of tokens.css — the one
 * sanctioned duplication of colour literals outside src/styles/ — because the
 * live contrast gate has to do real maths on real colours, and var() has no
 * value until a browser resolves it.
 *
 * A mirror with nothing holding it to its source drifts. The failure that
 * drift produces is silent and shippable: lower a room's --accent-2 below
 * 4.5:1 in tokens.css and the panel keeps offering it, emits
 * `color: var(--accent-2)` — a token reference, so the no-hardcoded-hex sweep
 * is perfectly happy — and an unreadable colour ships. tests/contrast.test.ts
 * never notices, because it only exercises the pure maths.
 *
 * So this file PARSES tokens.css and asserts the mirror equals it. Editing
 * tokens.css now breaks a test instead of slipping through.
 */

const TOKENS_CSS = readFileSync('src/styles/tokens.css', 'utf8');

/** tokens.css has no nested braces and no braces inside comments or values,
    so the block for a selector runs to the next `}`. */
function declarations(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(TOKENS_CSS);
  if (!block) throw new Error(`tokens.css has no "${selector}" block`);
  const body = block[1].replace(/\/\*[\s\S]*?\*\//g, '');
  const out: Record<string, string> = {};
  for (const line of body.split(';')) {
    const decl = /^\s*(--[\w-]+)\s*:\s*(.+?)\s*$/.exec(line);
    if (decl) out[decl[1]] = decl[2];
  }
  return out;
}

const ROOT = declarations(':root');
const ROOMS = ['home', 'projects', 'music', 'workshop'] as const;
const ROOM_TOKENS = Object.fromEntries(
  ROOMS.map((room) => [room, declarations(`[data-room="${room}"]`)]),
) as Record<(typeof ROOMS)[number], Record<string, string>>;

/** The px floor of a step: the first argument of its clamp(), or the whole
    value when it is a bare px (--step-body, --step-meta). */
function stepMinPx(step: StepKey): number {
  const raw = ROOT[`--step-${step}`];
  if (!raw) throw new Error(`tokens.css has no --step-${step}`);
  const clamped = /^clamp\(\s*([\d.]+)px/.exec(raw);
  const bare = /^([\d.]+)px$/.exec(raw);
  const px = clamped?.[1] ?? bare?.[1];
  if (!px) throw new Error(`--step-${step} is neither a clamp() nor a bare px value: ${raw}`);
  return Number(px);
}

describe('the tokens.css parser this file depends on', () => {
  it('reads a :root token', () => {
    expect(ROOT['--fg']).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('reads a per-room token', () => {
    expect(ROOM_TOKENS.music['--accent-2']).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('does not mistake a comment for a declaration', () => {
    expect(Object.keys(ROOT).every((k) => k.startsWith('--'))).toBe(true);
  });
});

describe('styleControls.ts mirrors tokens.css exactly', () => {
  it('mirrors every sitewide foreground token', () => {
    for (const key of ['fg', 'fg-dim', 'muted', 'accent'] as ColorKey[]) {
      expect(FG[key], `--${key}`).toBe(ROOT[`--${key}`]);
    }
  });

  it('leaves accent-2 blank in FG, because it is per-room', () => {
    expect(FG['accent-2']).toBe('');
  });

  it('mirrors every room ground', () => {
    expect(Object.keys(ROOM_BG).sort()).toEqual([...ROOMS].sort());
    for (const room of ROOMS) {
      expect(ROOM_BG[room], `${room} --bg`).toBe(ROOM_TOKENS[room]['--bg']);
    }
  });

  it('mirrors every room accent', () => {
    expect(Object.keys(ROOM_ACCENT2).sort()).toEqual([...ROOMS].sort());
    for (const room of ROOMS) {
      expect(ROOM_ACCENT2[room], `${room} --accent-2`).toBe(ROOM_TOKENS[room]['--accent-2']);
    }
  });

  it('mirrors every step floor against the clamp() minimums', () => {
    for (const step of MANIFEST.steps) {
      expect(STEP_MIN_PX[step], `--step-${step}`).toBe(stepMinPx(step));
    }
  });

  it('covers exactly the steps the panel offers, no more and no fewer', () => {
    expect(Object.keys(STEP_MIN_PX).sort()).toEqual([...MANIFEST.steps].sort());
  });
});

describe('every colour the panel offers clears 4.5:1 against the REAL tokens', () => {
  it.each(ROOMS)('%s', (room) => {
    for (const color of MANIFEST.colors) {
      const fg = color === 'accent-2' ? ROOM_TOKENS[room]['--accent-2'] : ROOT[`--${color}`];
      expect(contrastRatio(fg, ROOM_TOKENS[room]['--bg']), `--${color} on ${room}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
