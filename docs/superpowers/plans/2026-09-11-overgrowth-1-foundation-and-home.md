# Overgrowth 1 — Foundation & Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Overgrowth token layer, motion engine, and image system, then rebuild the Home page on top of them — including the six-layer parallax hero.

**Architecture:** CSS custom properties carry the whole design system: fixed tokens in `:root`, per-page overrides in four `[data-room]` blocks. One rAF loop writes a single `--p` (0→1 scroll progress) custom property per in-view `.stack`; CSS transforms do all the moving. Lenis smooths the scroll that loop reads. Pure logic (contrast maths, progress maths, guard regexes, image-frame marking) lives in `src/lib/*` as testable modules; `src/shared/*` does the DOM wiring.

**Tech Stack:** Vite 8 multi-page build, TypeScript 6, React 19 (islands only), Lenis, Vitest + jsdom (dev only), Vercel.

**Spec:** `docs/superpowers/specs/2026-09-11-portfolio-overgrowth-rebuild-design.md`

**Plan 1 of 3.** Plan 2 is Projects & Cache It; Plan 3 is Music & Workshop. This plan ships a complete, deployable Home page on its own.

---

## Global Constraints

Every task's requirements implicitly include all of these. Values are copied verbatim from the spec.

- **Branch:** `portfolio-overgrowth-rebuild`. Do not merge to `main` without asking.
- **Résumé is canon.** Every fact and number on the site traces to the résumé. **Zero invented metrics.** Where a value is unknown, ship a literal `—` plus an HTML comment naming what belongs there.
- **Zero hardcoded hex** outside `:root` and `[data-room]` blocks. Use `color-mix(in oklab, var(--token) N%, transparent)` for tints.
- **Clay `--accent` appears only on clickable things.** Max ~2 visible uses of each colour per screen. `--accent-2` is never a button fill except an active filter pill.
- **Buttons are solid fills with dark text**, never outlines, with 2px press travel and a darker pressed state.
- **Type rules:** ALL CAPS always gets ≥ `0.06em` positive tracking. Display text ≥32px always gets negative tracking. Three weights only (400/500/600). Body copy capped at ~62ch.
- **Motion:** only `transform` and `opacity` animate. No `background-position`, no animating `top`. Blur goes on a child, never on a transformed parent. Use `100svh`, never `100vh`.
- **Banned outright:** neon, glow, bloom, gradients used as light, pure black `#000` backgrounds, pure white `#fff` text, looping micro-animations, pulsing badges, emoji as icons, outline-only primary buttons, lorem ipsum.
- **Banned strings:** `SECTOR_`, `NODE_YP`, `LOG_0`, `UPLINK_`, `SIGNAL_LIVE`, `BUILD_STATIC`, `STATUS: ONLINE`.
- **Breakpoints to verify, no horizontal scroll:** 360 / 390 / 430 / 600 / 744 / 768 / 1024 / 1366 / 1440 / 1920.
- **Contrast gates:** body ≤16px on `--bg` ≥ 4.5:1; large text ≥ 3:1; dark text on a filled clay button ≥ 5:1.
- **Commit after every task.** Conventional-commit prefixes (`feat:`, `test:`, `refactor:`, `style:`).

### Decisions this plan locks in

- **The hover-expand icon rail is removed sitewide.** The spec's IA (§8) never mentions it, and its `NODE_YP` / `STATUS: ONLINE` identity block is banned copy. A left rail returns only inside tier-3 case studies (Plan 2, spec §9).
- **`src/styles/site.css` is replaced, not edited.** It carries the old lime palette, the glass cards, the `eq-bars`, and the tilt effects — all banned. Page-specific styles that survive get moved into the new files deliberately.
- **Vitest is a dev dependency only.** Zero bytes ship. It exists because contrast ratios, progress maths, and the guard rules above are genuinely testable, and the guards keep the spec enforceable after this plan ends.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/contrast.ts` | WCAG relative luminance and contrast ratio. Pure. |
| `src/lib/guards.ts` | Detect banned copy strings and hardcoded hex. Pure. |
| `src/lib/stackProgress.ts` | Scroll progress maths for one stack. Pure. |
| `src/lib/imageFrame.ts` | Mark a `.frame` whose image failed. Near-pure, takes DOM nodes. |
| `src/shared/motion.ts` | rAF loop, Lenis, IntersectionObserver culling, one-shot reveals. |
| `src/shared/chrome.ts` | Header, mobile menu, in-page smooth scroll. Replaces `site.ts`. |
| `src/styles/tokens.css` | `:root` + four `[data-room]` blocks + type scale. The only colour file. |
| `src/styles/base.css` | Reset, grain, container, section rhythm, typography, buttons, frames. |
| `src/styles/stack.css` | `.stack` / `.stack-view` / `.plate`, hero layers, the seven CSS trunks. |
| `src/styles/home.css` | Home-only section layouts. |
| `index.html` | Home. Full rewrite. |
| `tests/*.test.ts` | Vitest suites mirroring `src/lib`. |
| `vitest.config.ts` | jsdom environment. |

Deleted at the end of Task 8: `src/styles/site.css`, `src/shared/site.ts`.

---

### Task 1: Test harness and guard rules

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/guards.ts`
- Create: `tests/guards.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `findForbiddenCopy(source: string): string[]` and `findHardcodedHex(css: string): string[]`, both from `src/lib/guards.ts`. Task 3 and Task 7 call them. Also `npm test`.

**Why the guards test detector functions rather than repo files:** the repo still violates every rule at this point. Testing the *detector* against fixture strings keeps each task green while still giving later tasks a real assertion to run against real files once those files are clean.

- [ ] **Step 1: Install the test runner**

```bash
npm install -D vitest jsdom
```

- [ ] **Step 2: Add the config and script**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
```

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Write the failing test**

Create `tests/guards.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { findForbiddenCopy, findHardcodedHex } from '../src/lib/guards';

describe('findForbiddenCopy', () => {
  it('finds the terminal-cosplay strings the spec bans', () => {
    const src = '<p class="eyebrow">Sector_01 // Experience_Log</p><div>NODE_YP</div>';
    expect(findForbiddenCopy(src)).toEqual(
      expect.arrayContaining([expect.stringMatching(/Sector_/i), 'NODE_YP']),
    );
  });

  it('finds log ids, uplink and build-status lines', () => {
    const src = 'LOG_001 ... UPLINK_READY ... SIGNAL_LIVE ... BUILD_STATIC // NO_FRAMEWORK';
    expect(findForbiddenCopy(src)).toHaveLength(4);
  });

  it('returns an empty array for clean copy', () => {
    expect(findForbiddenCopy('<h1>Yosef Pilip</h1><p>I build things.</p>')).toEqual([]);
  });

  it('does not false-positive on ordinary words containing "log"', () => {
    expect(findForbiddenCopy('<p>A running log of roles.</p>')).toEqual([]);
  });
});

describe('findHardcodedHex', () => {
  it('ignores hex inside :root', () => {
    const css = ':root { --bg: #171b19; --fg: #f0efe9; }\n.card { color: var(--fg); }';
    expect(findHardcodedHex(css)).toEqual([]);
  });

  it('ignores hex inside a [data-room] block', () => {
    const css = '[data-room="home"] { --accent-2: #8aa572; }\n.x { color: var(--accent-2); }';
    expect(findHardcodedHex(css)).toEqual([]);
  });

  it('reports hex used anywhere else', () => {
    const css = ':root { --bg: #171b19; }\n.card { border-color: #ff0000; }';
    expect(findHardcodedHex(css)).toEqual(['#ff0000']);
  });

  it('ignores hex inside comments', () => {
    const css = '/* was #a4d64c before the rebuild */\n.card { color: var(--fg); }';
    expect(findHardcodedHex(css)).toEqual([]);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../src/lib/guards"`.

- [ ] **Step 5: Write the implementation**

Create `src/lib/guards.ts`:

```ts
/** Copy patterns the spec bans outright (§11). */
const FORBIDDEN_COPY: RegExp[] = [
  /SECTOR_\w+/gi,
  /NODE_YP/gi,
  /LOG_\d+/gi,
  /UPLINK_\w+/gi,
  /SIGNAL_LIVE/gi,
  /BUILD_STATIC/gi,
  /STATUS:\s*ONLINE/gi,
];

/** Every banned string present in `source`, in the order the patterns are listed. */
export function findForbiddenCopy(source: string): string[] {
  const hits: string[] = [];
  for (const pattern of FORBIDDEN_COPY) {
    const matches = source.match(pattern);
    if (matches) hits.push(...matches);
  }
  return hits;
}

/** Blocks where colour literals are allowed to live: the token blocks only. */
const TOKEN_BLOCK = /(?::root|\[data-room="[a-z]+"\])\s*\{[^}]*\}/g;
const COMMENT = /\/\*[\s\S]*?\*\//g;
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

/** Every colour literal in `css` that sits outside a token block. */
export function findHardcodedHex(css: string): string[] {
  const stripped = css.replace(COMMENT, '').replace(TOKEN_BLOCK, '');
  return stripped.match(HEX) ?? [];
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 8 tests.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/lib/guards.ts tests/guards.test.ts
git commit -m "test: add vitest and guard rules for banned copy and hardcoded hex"
```

---

### Task 2: Colour tokens, verified against WCAG

**Files:**
- Create: `src/lib/contrast.ts`
- Create: `tests/contrast.test.ts`
- Create: `src/styles/tokens.css`
- Create: `tests/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `hexToRgb(hex: string): {r:number;g:number;b:number}`, `relativeLuminance(hex: string): number`, `contrastRatio(a: string, b: string): number` from `src/lib/contrast.ts`. `src/styles/tokens.css` defines every colour and type token the rest of the site uses.

- [ ] **Step 1: Write the failing contrast test**

Create `tests/contrast.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hexToRgb, relativeLuminance, contrastRatio } from '../src/lib/contrast';

describe('hexToRgb', () => {
  it('parses six-digit hex', () => {
    expect(hexToRgb('#cf6b3e')).toEqual({ r: 207, g: 107, b: 62 });
  });

  it('expands three-digit shorthand', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('throws on anything that is not a colour', () => {
    expect(() => hexToRgb('var(--accent)')).toThrow();
  });
});

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('is 1:1 for a colour against itself', () => {
    expect(contrastRatio('#171b19', '#171b19')).toBeCloseTo(1, 5);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#cf6b3e', '#171b19')).toBeCloseTo(contrastRatio('#171b19', '#cf6b3e'), 5);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../src/lib/contrast"`.

- [ ] **Step 3: Write the contrast implementation**

Create `src/lib/contrast.ts`:

```ts
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const raw = hex.trim().replace(/^#/, '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a hex colour: ${hex}`);
  }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** sRGB channel linearisation, per WCAG 2.1. */
function linearise(value8bit: number): number {
  const c = value8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Write the token file**

Create `src/styles/tokens.css`:

```css
/* Overgrowth tokens. The ONLY file in the project allowed to contain colour
   literals. Everything else uses var() or color-mix(). See spec §3 and §4. */

:root {
  /* ── fixed sitewide: what makes four rooms read as one building ── */
  --fg:            #f0efe9;              /* bone — never pure white */
  --fg-dim:        #c2c4bc;              /* secondary prose */
  --muted:         #8e958a;              /* labels, meta, dates */
  --border:        rgba(240, 239, 233, 0.12);
  --border-strong: rgba(240, 239, 233, 0.24);

  --accent:        #cf6b3e;              /* clay — ACTION only */
  --accent-press:  #b45a31;              /* clay, pressed */
  --on-accent:     #17110c;              /* dark text on a filled clay button */

  /* ── type ── */
  --font-display: 'Instrument Serif', 'Iowan Old Style', Georgia, serif;
  --font-body:    'Outfit', system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  --font-mono:    ui-monospace, 'JetBrains Mono', Menlo, monospace;

  --step-wordmark: clamp(38px, 13.5vw, 290px);
  --step-display:  clamp(56px, 9vw, 132px);
  --step-h1:       clamp(40px, 6vw, 76px);
  --step-h2:       clamp(28px, 3.4vw, 44px);
  --step-lede:     clamp(19px, 1.7vw, 26px);
  --step-body:     17px;
  --step-meta:     12px;

  /* ── geometry ── */
  --r:       8px;
  --gutter:  clamp(20px, 5vw, 88px);
  --section: clamp(72px, 11vw, 168px);
  --stack-h: 240vh;                      /* Home hero overrides to 260vh */

  /* ── fallback room so an unlabelled page is never unstyled ── */
  --bg:           #171b19;
  --bg-deep:      #0f1512;
  --surface:      #1f2422;
  --surface-tint: #222c25;
  --accent-2:     #8aa572;
}

[data-room="home"]     { --bg:#171b19; --bg-deep:#0f1512; --surface:#1f2422; --surface-tint:#222c25; --accent-2:#8aa572; }
[data-room="projects"] { --bg:#16191d; --bg-deep:#0e1115; --surface:#1f232a; --surface-tint:#222831; --accent-2:#7f9bbd; }
[data-room="music"]    { --bg:#1a171d; --bg-deep:#0c090f; --surface:#24202a; --surface-tint:#2a2130; --accent-2:#b97fc9; }
[data-room="workshop"] { --bg:#1b1917; --bg-deep:#12100e; --surface:#241f1b; --surface-tint:#2b2621; --accent-2:#c0a06a; }
```

- [ ] **Step 6: Write the failing token test**

Create `tests/tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { contrastRatio } from '../src/lib/contrast';

const css = readFileSync('src/styles/tokens.css', 'utf8');

/** Pull one custom property out of a given block. */
function token(block: string, name: string): string {
  const blockRe = new RegExp(`${block}\\s*\\{([^}]*)\\}`);
  const body = css.match(blockRe);
  if (!body) throw new Error(`No block ${block}`);
  const prop = body[1].match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
  if (!prop) throw new Error(`No --${name} in ${block}`);
  return prop[1].trim();
}

const ROOMS = ['home', 'projects', 'music', 'workshop'] as const;

describe('tokens.css', () => {
  it('defines all four rooms', () => {
    for (const room of ROOMS) {
      expect(css).toContain(`[data-room="${room}"]`);
    }
  });

  it('gives every room its own ground, surfaces and category colour', () => {
    for (const room of ROOMS) {
      const block = `\\[data-room="${room}"\\]`;
      for (const name of ['bg', 'bg-deep', 'surface', 'surface-tint', 'accent-2']) {
        expect(token(block, name)).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('never redefines the action colour per room — clay is learnable', () => {
    for (const room of ROOMS) {
      const block = css.match(new RegExp(`\\[data-room="${room}"\\]\\s*\\{([^}]*)\\}`))![1];
      expect(block).not.toContain('--accent:');
    }
  });

  it('gives every room four distinct category colours', () => {
    const seen = ROOMS.map((r) => token(`\\[data-room="${r}"\\]`, 'accent-2'));
    expect(new Set(seen).size).toBe(4);
  });

  it('meets the body-text contrast gate in every room', () => {
    for (const room of ROOMS) {
      const bg = token(`\\[data-room="${room}"\\]`, 'bg');
      expect(contrastRatio(token(':root', 'fg'), bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(token(':root', 'fg-dim'), bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(token(':root', 'muted'), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('meets the action and category gates in every room', () => {
    for (const room of ROOMS) {
      const bg = token(`\\[data-room="${room}"\\]`, 'bg');
      expect(contrastRatio(token(':root', 'accent'), bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(token(`\\[data-room="${room}"\\]`, 'accent-2'), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps dark text on a filled clay button above 5:1', () => {
    expect(contrastRatio(token(':root', 'on-accent'), token(':root', 'accent')))
      .toBeGreaterThanOrEqual(5);
  });
});
```

- [ ] **Step 7: Run and confirm every gate passes**

Run: `npm test`
Expected: PASS. If the ochre/clay row fails, **do not shift ochre's hue** — desaturate toward `#b5a184`, per spec §3.2.

- [ ] **Step 8: Commit**

```bash
git add src/lib/contrast.ts src/styles/tokens.css tests/contrast.test.ts tests/tokens.test.ts
git commit -m "feat: add Overgrowth colour tokens with WCAG-verified contrast"
```

---

### Task 3: Base layer — reset, type scale, grain, buttons, frames

**Files:**
- Create: `src/styles/base.css`
- Create: `tests/base-css.test.ts`

**Interfaces:**
- Consumes: every token from Task 2.
- Produces: the class vocabulary later tasks build markup against — `.container`, `.section`, `.eyebrow`, `.lede`, `.meta`, `.btn`, `.btn--primary`, `.btn--quiet`, `.frame`, `.reveal`, `.grain`, `.split-7-5`, `.split-5-7`.

- [ ] **Step 1: Write the base stylesheet**

Create `src/styles/base.css`:

```css
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { -webkit-text-size-adjust: 100%; }

body {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-body);
  font-size: var(--step-body);
  font-weight: 400;
  line-height: 1.6;
  overflow-x: hidden;
}

a { color: inherit; text-decoration: none; }
ul { list-style: none; }
img { max-width: 100%; display: block; }
::selection { background: var(--accent); color: var(--on-accent); }

/* ── grain: the only decorative layer in the system ── */
.grain {
  position: fixed;
  inset: 0;
  z-index: 90;
  pointer-events: none;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* ── layout ── */
.container { width: min(1440px, 100% - 2 * var(--gutter)); margin-inline: auto; }
.section { padding-block: var(--section); }
.section--tight { padding-block: calc(var(--section) * 0.55); }

/* Asymmetric only — never 50/50. */
.split-7-5, .split-5-7 { display: grid; gap: clamp(24px, 4vw, 72px); align-items: start; }
@media (min-width: 900px) {
  .split-7-5 { grid-template-columns: 7fr 5fr; }
  .split-5-7 { grid-template-columns: 5fr 7fr; }
}

/* ── type ── */
.display, h1, h2 { font-family: var(--font-display); font-weight: 400; }
.display { font-size: var(--step-display); line-height: 0.95; letter-spacing: -0.03em; }
h1        { font-size: var(--step-h1);      line-height: 1.02; letter-spacing: -0.02em; }
h2        { font-size: var(--step-h2);      line-height: 1.1;  letter-spacing: -0.015em; }

.lede { font-size: var(--step-lede); line-height: 1.5; color: var(--fg-dim); max-width: 46ch; }
p { max-width: 62ch; }
p + p { margin-top: 1.1em; }

/* ALL CAPS always gets positive tracking. */
.eyebrow, .meta {
  font-family: var(--font-mono);
  font-size: var(--step-meta);
  line-height: 1.5;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.eyebrow { color: var(--accent-2); font-weight: 600; }
.meta    { color: var(--muted); }

/* ── buttons: solid fill, dark text, 2px press travel ── */
.btn {
  display: inline-block;
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 500;
  padding: 13px 22px;
  border-radius: var(--r);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color 0.16s ease, transform 0.16s ease;
}
.btn--primary { background: var(--accent); color: var(--on-accent); }
.btn--primary:hover { background: var(--accent-press); }
.btn--primary:active { transform: translateY(2px); }
.btn--quiet { border-color: var(--border-strong); color: var(--fg); }
.btn--quiet:hover { background: color-mix(in oklab, var(--fg) 7%, transparent); }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

/* ── panels and hairlines ── */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: clamp(20px, 3vw, 36px);
}
.panel--tint { background: var(--surface-tint); }
.rule { border: 0; border-top: 1px solid var(--border); }

/* ── image frames: labelled placeholder until the file exists ── */
.frame {
  position: relative;
  overflow: hidden;
  border-radius: var(--r);
  background: var(--bg-deep);
  aspect-ratio: var(--ar, 3 / 2);
}
.frame img { width: 100%; height: 100%; object-fit: cover; }
.frame.is-missing img { display: none; }
.frame.is-missing::after {
  content: attr(data-label);
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  padding: 16px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--step-meta);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r);
}

/* ── one-shot reveal ── */
.reveal { opacity: 0; transform: translate3d(0, 16px, 0); transition: opacity 0.7s ease, transform 0.7s ease; }
.reveal.is-visible { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
  .reveal { opacity: 1; transform: none; }
}
```

- [ ] **Step 2: Write the failing guard test**

Create `tests/base-css.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the test**

Run: `npm test`
Expected: PASS. If `findHardcodedHex` reports the grain SVG, confirm the data URI uses `%23` (URL-encoded `#`) — it does in the CSS above, so a failure here means the SVG was retyped with a literal `#`.

- [ ] **Step 4: Commit**

```bash
git add src/styles/base.css tests/base-css.test.ts
git commit -m "feat: add base layer — reset, type scale, grain, buttons, image frames"
```

---

### Task 4: Parallax progress maths and the motion engine

**Files:**
- Create: `src/lib/stackProgress.ts`
- Create: `tests/stackProgress.test.ts`
- Create: `src/styles/stack.css`
- Create: `src/shared/motion.ts`

**Interfaces:**
- Consumes: `.stack` / `.stack-view` / `.plate` markup (Task 6 produces it), `.reveal` from Task 3.
- Produces: `computeStackProgress(rectTop: number, rectHeight: number, viewportHeight: number): number` and `clamp01(n: number): number` from `src/lib/stackProgress.ts`; `initMotion(): void` from `src/shared/motion.ts`. Plans 2 and 3 both call `initMotion()`.

- [ ] **Step 1: Install Lenis**

```bash
npm install lenis
```

- [ ] **Step 2: Write the failing progress test**

Create `tests/stackProgress.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeStackProgress, clamp01 } from '../src/lib/stackProgress';

const VH = 800;
const TALL = 2400; // a 300vh stack; travel = 1600

describe('clamp01', () => {
  it('clamps below and above', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(9)).toBe(1);
  });

  it('treats NaN as 0 rather than propagating it into a transform', () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('computeStackProgress', () => {
  it('is 0 while the stack is still below the viewport', () => {
    expect(computeStackProgress(1200, TALL, VH)).toBe(0);
  });

  it('is 0 exactly when the stack top meets the viewport top', () => {
    expect(computeStackProgress(0, TALL, VH)).toBe(0);
  });

  it('is 0.5 at the halfway point of its travel', () => {
    expect(computeStackProgress(-800, TALL, VH)).toBeCloseTo(0.5, 5);
  });

  it('is 1 when the stack bottom meets the viewport bottom', () => {
    expect(computeStackProgress(-1600, TALL, VH)).toBe(1);
  });

  it('stays 1 after the stack has scrolled past', () => {
    expect(computeStackProgress(-5000, TALL, VH)).toBe(1);
  });

  it('is 0 for a stack no taller than the viewport — there is no travel', () => {
    expect(computeStackProgress(-10, VH, VH)).toBe(0);
    expect(computeStackProgress(-10, 400, VH)).toBe(0);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../src/lib/stackProgress"`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/stackProgress.ts`:

```ts
export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Scroll progress of one sticky stack, 0 → 1.
 *
 * 0 is the moment the stack's top reaches the viewport top; 1 is the moment
 * its bottom reaches the viewport bottom. A stack no taller than the viewport
 * has no travel and stays at 0.
 *
 * @param rectTop        getBoundingClientRect().top of the .stack element
 * @param rectHeight     its full height, including the scroll runway
 * @param viewportHeight window.innerHeight
 */
export function computeStackProgress(
  rectTop: number,
  rectHeight: number,
  viewportHeight: number,
): number {
  const travel = rectHeight - viewportHeight;
  if (travel <= 0) return 0;
  return clamp01(-rectTop / travel);
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm test`
Expected: PASS — 8 new tests.

- [ ] **Step 6: Write the stack stylesheet**

Create `src/styles/stack.css`:

```css
/* Sticky layer parallax. JS writes a single --p per in-view .stack; CSS moves
   everything off it. Only transform and opacity animate. See spec §6a and §7. */

.stack { position: relative; height: var(--stack-h); }

.stack-view {
  position: sticky;
  top: 0;
  height: 100svh;          /* svh, not vh — iOS jumps when the bar hides */
  overflow: hidden;
}

.plate {
  position: absolute;
  inset: -12% -3%;
  will-change: transform;
  transform: translate3d(0, calc(var(--p, 0) * var(--rate, 0) * 1px), 0);
}
.plate img { width: 100%; height: 100%; object-fit: cover; }

/* Blur lives on a child, never on the transformed parent, or the browser
   re-rasterises it every frame. */
.plate > .blurred { filter: blur(var(--blur, 0)); width: 100%; height: 100%; }

/* Body stacks: three plates. */
.plate--back  { z-index: 1; --rate: -90; }
.plate--copy  { z-index: 2; --rate: -260; display: grid; place-content: center; padding-inline: var(--gutter); }
.plate--front { z-index: 3; --rate: -430; }

/* ── the hero: six layers, Home only ── */
.hero { --stack-h: 260vh; }
.hero .plate--canopy { z-index: 1; --rate: -60; }
.hero .plate--fog    { z-index: 2; --rate: -120; }
.hero .plate--trees  { z-index: 3; --rate: -190; }
.hero .plate--name   { z-index: 4; --rate: -250; display: grid; place-content: center; }
.hero .plate--trunks { z-index: 5; --rate: -350; }
.hero .plate--low    { z-index: 6; --rate: -440; }

.hero-wordmark {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: var(--step-wordmark);
  line-height: 1;
  letter-spacing: 0.06em;   /* caps always get positive tracking */
  text-transform: uppercase;
  text-align: center;
  color: var(--fg);
  white-space: nowrap;
}

/* Fog is CSS, not an image. No gradient used as *light* — this is atmosphere
   sitting between depth planes, which is what fog physically is. */
.hero .plate--fog::after,
.hero .plate--low::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    color-mix(in oklab, var(--bg-deep) 92%, transparent) 0%,
    color-mix(in oklab, var(--bg-deep) 40%, transparent) 45%,
    transparent 80%
  );
}
.hero .plate--low::after { opacity: 0.8; }

/* ── the seven front trunks: CSS, not an image ──
   Alpha cutouts from image models halo; out-of-focus trunks in fog are just
   soft vertical shapes. Positions are deliberately irregular — evenly spaced
   bars read as a barcode, not a forest. Spec §7. */
.trunk {
  position: absolute;
  top: -10%;
  height: 120%;
  background: linear-gradient(
    90deg,
    var(--bg-deep) 0%,
    color-mix(in oklab, var(--bg-deep) 60%, var(--surface)) 55%,
    var(--bg-deep) 100%
  );
  filter: blur(var(--blur));
}
.trunk--1 { left: 12.5%; width: clamp(10px, 2.6vw, 62px); --blur: 5px; }
.trunk--2 { left: 24%;   width: clamp(10px, 1.7vw, 62px); --blur: 3px; }
.trunk--3 { left: 35.5%; width: clamp(10px, 3.1vw, 62px); --blur: 7px; }
.trunk--4 { left: 48%;   width: clamp(10px, 1.5vw, 62px); --blur: 2px; }
.trunk--5 { left: 59%;   width: clamp(10px, 2.3vw, 62px); --blur: 5px; }
.trunk--6 { left: 74%;   width: clamp(10px, 1.9vw, 62px); --blur: 4px; }
.trunk--7 { left: 88%;   width: clamp(10px, 3.4vw, 62px); --blur: 8px; }

/* Hero intro copy: z-index 7, bottom-left, deliberately NOT parallaxed. */
.hero-intro {
  position: absolute;
  z-index: 7;
  left: var(--gutter);
  bottom: clamp(48px, 9vh, 104px);
  max-width: 34ch;
}

/* A single hairline tick fills across the bottom. No numbers, no badge. */
.hero-progress {
  position: absolute;
  z-index: 7;
  left: 0; right: 0; bottom: 0;
  height: 1px;
  background: var(--border);
}
.hero-progress::after {
  content: '';
  display: block;
  height: 100%;
  width: calc(var(--p, 0) * 100%);
  background: var(--accent-2);
}

@media (max-width: 744px) {
  .hero-wordmark { font-size: 22vw; white-space: normal; max-width: 7ch; text-align: left; }
  .hero .plate--canopy { --rate: -36; }
  .hero .plate--fog    { --rate: -70; }
  .hero .plate--trees  { --rate: -110; }
  .hero .plate--name   { --rate: -150; place-content: center start; padding-inline: var(--gutter); }
  .hero .plate--trunks { --rate: -215; }
  .hero .plate--low    { --rate: -270; }
  /* Bars 3 and 6 hide so the name still reads. */
  .trunk--3, .trunk--6 { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .stack { height: auto; }
  .stack-view { position: relative; height: 72svh; }
  .plate { transform: none; }
}
```

- [ ] **Step 7: Write the motion engine**

Create `src/shared/motion.ts`:

```ts
import Lenis from 'lenis';
import { computeStackProgress } from '../lib/stackProgress';

/**
 * Starts the one rAF loop that drives every scroll-linked effect on the page:
 * Lenis smoothing, a --p custom property per in-view .stack, and one-shot
 * reveals. Safe to call on a page with no stacks.
 */
export function initMotion(): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stacks = Array.from(document.querySelectorAll<HTMLElement>('.stack'));

  if (reduceMotion) {
    // Pin every stack mid-travel and show everything. Nothing hidden, nothing moving.
    stacks.forEach((stack) => stack.style.setProperty('--p', '0.5'));
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
    return;
  }

  // Only stacks currently on screen get measured each frame.
  const onScreen = new Set<HTMLElement>();
  const culler = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) onScreen.add(el);
        else onScreen.delete(el);
      });
    },
    { rootMargin: '10% 0px' },
  );
  stacks.forEach((stack) => culler.observe(stack));

  const lenis = new Lenis({ duration: 1.05, smoothWheel: true });

  function frame(time: number): void {
    lenis.raf(time);
    const viewportHeight = window.innerHeight;
    onScreen.forEach((stack) => {
      const rect = stack.getBoundingClientRect();
      const p = computeStackProgress(rect.top, rect.height, viewportHeight);
      stack.style.setProperty('--p', p.toFixed(4));
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // One-shot reveals: each element unobserves itself so scrolling back never replays it.
  const revealer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
  );
  document.querySelectorAll('.reveal').forEach((el) => revealer.observe(el));
}
```

- [ ] **Step 8: Run the full suite and typecheck**

Run: `npm test && npx tsc -b --noEmit`
Expected: tests PASS, no type errors.

- [ ] **Step 9: Commit**

```bash
git add src/lib/stackProgress.ts src/shared/motion.ts src/styles/stack.css tests/stackProgress.test.ts package.json package-lock.json
git commit -m "feat: add sticky-parallax engine, Lenis, and the six-layer hero styles"
```

---

### Task 5: Image frame fallback

**Files:**
- Create: `src/lib/imageFrame.ts`
- Create: `tests/imageFrame.test.ts`
- Create: `src/shared/chrome.ts`

**Interfaces:**
- Consumes: `.frame` and `.frame.is-missing` CSS from Task 3.
- Produces: `markMissing(img: HTMLImageElement): void`, `sweepLoadedImages(doc: Document): void`, `installImageFallback(doc: Document): void` from `src/lib/imageFrame.ts`; `initChrome(): void` from `src/shared/chrome.ts`. Plans 2 and 3 call both.

**Why a capture-phase listener:** image `error` events do not bubble, so a listener on `document` only sees them in the capture phase. The sweep catches images that already failed before the module ran.

- [ ] **Step 1: Write the failing test**

Create `tests/imageFrame.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { markMissing, sweepLoadedImages } from '../src/lib/imageFrame';

function frameWithImage(): HTMLImageElement {
  document.body.innerHTML = `
    <figure class="frame" data-label="Hero — trees-back">
      <img src="/assets/img/trees-back.webp" alt="" />
    </figure>`;
  return document.querySelector('img')!;
}

beforeEach(() => { document.body.innerHTML = ''; });

describe('markMissing', () => {
  it('marks the wrapping frame so CSS can show the placeholder', () => {
    const img = frameWithImage();
    markMissing(img);
    expect(document.querySelector('.frame')!.classList.contains('is-missing')).toBe(true);
  });

  it('does nothing when the image is not inside a frame', () => {
    document.body.innerHTML = '<img src="/nope.webp" alt="" />';
    const img = document.querySelector('img')!;
    expect(() => markMissing(img)).not.toThrow();
    expect(document.querySelectorAll('.is-missing')).toHaveLength(0);
  });

  it('is idempotent', () => {
    const img = frameWithImage();
    markMissing(img);
    markMissing(img);
    expect(document.querySelector('.frame')!.className).toBe('frame is-missing');
  });
});

describe('sweepLoadedImages', () => {
  it('marks images that finished loading with no intrinsic width', () => {
    const img = frameWithImage();
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 0 });
    sweepLoadedImages(document);
    expect(document.querySelector('.frame')!.classList.contains('is-missing')).toBe(true);
  });

  it('leaves successfully loaded images alone', () => {
    const img = frameWithImage();
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: 2400 });
    sweepLoadedImages(document);
    expect(document.querySelector('.frame')!.classList.contains('is-missing')).toBe(false);
  });

  it('leaves still-loading images alone', () => {
    const img = frameWithImage();
    Object.defineProperty(img, 'complete', { value: false });
    Object.defineProperty(img, 'naturalWidth', { value: 0 });
    sweepLoadedImages(document);
    expect(document.querySelector('.frame')!.classList.contains('is-missing')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../src/lib/imageFrame"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/imageFrame.ts`:

```ts
/** Flag the .frame wrapping a failed image so its labelled placeholder shows. */
export function markMissing(img: HTMLImageElement): void {
  const frame = img.closest('.frame');
  if (frame) frame.classList.add('is-missing');
}

/** Catch images that already failed before this module ran. */
export function sweepLoadedImages(doc: Document): void {
  Array.from(doc.images).forEach((img) => {
    if (img.complete && img.naturalWidth === 0) markMissing(img);
  });
}

/**
 * Every image slot on the site is a real <img> at its final path. While the
 * file is missing the frame shows a labelled box at the exact aspect ratio, so
 * composition can be judged before spending on generation. Drop the file in
 * and it works with no code change.
 */
export function installImageFallback(doc: Document): void {
  // Capture phase: image error events do not bubble.
  doc.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement) markMissing(target);
    },
    true,
  );
  sweepLoadedImages(doc);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test`
Expected: PASS — 6 new tests.

- [ ] **Step 5: Write the chrome module**

Create `src/shared/chrome.ts`. This replaces `src/shared/site.ts`; the old rail active-state, hero parallax and card-tilt code is deliberately not carried over.

```ts
import { installImageFallback } from '../lib/imageFrame';

/** Header behaviour, in-page anchors, and image placeholders. */
export function initChrome(): void {
  installImageFallback(document);

  const mobileMenu = document.getElementById('mobileMenu');
  const menuOpen = document.getElementById('menuOpen');
  const menuClose = document.getElementById('menuClose');

  menuOpen?.addEventListener('click', () => mobileMenu?.classList.add('is-open'));
  menuClose?.addEventListener('click', () => mobileMenu?.classList.remove('is-open'));

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
      mobileMenu?.classList.remove('is-open');
    });
  });
}
```

- [ ] **Step 6: Typecheck and commit**

Run: `npm test && npx tsc -b --noEmit`
Expected: tests PASS, no type errors.

```bash
git add src/lib/imageFrame.ts src/shared/chrome.ts tests/imageFrame.test.ts
git commit -m "feat: add image-frame placeholder fallback and rebuilt page chrome"
```

---

### Task 6: The Home hero — six layers

**Files:**
- Modify: `index.html` (hero section and `<head>` only; the rest of the body is Task 8)
- Create: `src/main.tsx` entry additions — modify existing
- Create: `tests/home-hero.test.ts`

**Interfaces:**
- Consumes: `initMotion()` (Task 4), `initChrome()` (Task 5), `.stack`/`.plate`/`.trunk`/`.hero-*` CSS (Task 4), `.frame` (Task 3).
- Produces: the `data-room="home"` page shell and hero markup Task 7 and Task 8 extend.

**This task is verifiable in a browser before any image exists** — the trunks and fog are CSS, so the hero is real immediately. That is the point of building it this early.

- [ ] **Step 1: Write the failing markup test**

Create `tests/home-hero.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findForbiddenCopy } from '../src/lib/guards';

const html = readFileSync('index.html', 'utf8');

describe('Home hero', () => {
  it('declares the home room so the palette applies', () => {
    expect(html).toMatch(/<body[^>]*data-room="home"/);
  });

  it('has exactly one h1 — the wordmark is real, selectable text', () => {
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
  });

  it('separates the names with a plain space, not &nbsp;, or mobile never wraps', () => {
    const wordmark = html.match(/<h1[^>]*class="hero-wordmark"[^>]*>([\s\S]*?)<\/h1>/);
    expect(wordmark).not.toBeNull();
    expect(wordmark![1]).not.toContain('&nbsp;');
    expect(wordmark![1].trim()).toBe('Yosef Pilip');
  });

  it('builds the six hero layers', () => {
    for (const layer of ['canopy', 'fog', 'trees', 'name', 'trunks', 'low']) {
      expect(html).toContain(`plate--${layer}`);
    }
  });

  it('draws seven front trunks', () => {
    expect(html.match(/class="trunk trunk--\d"/g) ?? []).toHaveLength(7);
  });

  it('carries no banned copy', () => {
    expect(findForbiddenCopy(html)).toEqual([]);
  });

  it('labels every image frame so the placeholder says what belongs there', () => {
    const frames = html.match(/<figure class="frame"[^>]*>/g) ?? [];
    expect(frames.length).toBeGreaterThan(0);
    frames.forEach((frame) => expect(frame).toContain('data-label='));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `index.html` still has the old markup, `data-room` missing, banned copy present.

- [ ] **Step 3: Replace the head and hero in `index.html`**

Replace everything from `<!DOCTYPE html>` through the closing `</section>` of the old `#hero` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Yosef Pilip</title>
  <meta name="description" content="Computer science student and AI developer. I build tools that delete other people's busywork." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/src/styles/home.css" />
</head>
<body data-room="home">

  <div id="intro-root"></div>
  <div class="grain" aria-hidden="true"></div>

  <header class="site-header">
    <div class="container site-header__inner">
      <a class="wordmark" href="/"><span id="name-flip-root">Yosef Pilip</span></a>
      <nav class="nav-desktop" aria-label="Primary">
        <a href="/" aria-current="page">Home</a>
        <a href="/projects.html">Projects</a>
        <a href="/music.html">DJ &amp; Music</a>
        <a href="/workshop.html">Workshop</a>
      </nav>
      <button class="menu-toggle" id="menuOpen" aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="17" x2="21" y2="17"/></svg>
      </button>
    </div>
  </header>

  <div class="mobile-menu" id="mobileMenu">
    <button class="mobile-menu__close" id="menuClose" aria-label="Close menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
    </button>
    <a href="/">Home</a>
    <a href="/projects.html">Projects</a>
    <a href="/music.html">DJ &amp; Music</a>
    <a href="/workshop.html">Workshop</a>
  </div>

  <main>

    <!-- ── HERO: six depth layers on one --p. The site's one signature move. ── -->
    <section class="stack hero" id="hero">
      <div class="stack-view">

        <div class="plate plate--canopy">
          <figure class="frame" style="--ar: 3 / 2; height: 100%;" data-label="Hero L1 — canopy-far">
            <img src="/assets/img/canopy-far.webp" alt="" loading="eager" />
          </figure>
        </div>

        <div class="plate plate--fog" aria-hidden="true"></div>

        <div class="plate plate--trees">
          <figure class="frame" style="--ar: 3 / 2; height: 100%;" data-label="Hero L3 — trees-back">
            <img src="/assets/img/trees-back.webp" alt="" loading="eager" />
          </figure>
        </div>

        <div class="plate plate--name">
          <h1 class="hero-wordmark">Yosef Pilip</h1>
        </div>

        <div class="plate plate--trunks" aria-hidden="true">
          <span class="trunk trunk--1"></span>
          <span class="trunk trunk--2"></span>
          <span class="trunk trunk--3"></span>
          <span class="trunk trunk--4"></span>
          <span class="trunk trunk--5"></span>
          <span class="trunk trunk--6"></span>
          <span class="trunk trunk--7"></span>
        </div>

        <div class="plate plate--low" aria-hidden="true"></div>

        <div class="hero-intro">
          <p class="eyebrow">CS at San Diego State &middot; AI developer &middot; DJ</p>
          <p class="lede">I build things that delete other people&rsquo;s busywork. Occasionally I make a room very loud.</p>
        </div>

        <div class="hero-progress" aria-hidden="true"></div>

      </div>
    </section>
```

Leave the rest of the old body in place for now — Task 8 replaces it.

- [ ] **Step 4: Create the Home stylesheet entry**

Create `src/styles/home.css`:

```css
@import './base.css';
@import './stack.css';

/* ── header ── */
.site-header {
  position: sticky;
  top: 0;
  z-index: 80;
  background: color-mix(in oklab, var(--bg) 86%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}
.site-header__inner { display: flex; align-items: center; justify-content: space-between; height: 64px; }
.wordmark { font-family: var(--font-display); font-size: 21px; letter-spacing: -0.01em; }
.nav-desktop { display: none; gap: 28px; font-size: 15px; }
.nav-desktop a { color: var(--fg-dim); }
.nav-desktop a:hover { color: var(--fg); }
.nav-desktop a[aria-current='page'] { color: var(--fg); }
@media (min-width: 800px) { .nav-desktop { display: flex; } .menu-toggle { display: none; } }

.menu-toggle { background: none; border: 0; color: var(--fg); cursor: pointer; padding: 8px; }
.menu-toggle svg { width: 24px; height: 24px; }

.mobile-menu {
  position: fixed;
  inset: 0;
  z-index: 95;
  background: var(--bg);
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  padding-inline: var(--gutter);
  font-family: var(--font-display);
  font-size: var(--step-h2);
}
.mobile-menu.is-open { display: flex; }
.mobile-menu__close { position: absolute; top: 18px; right: var(--gutter); background: none; border: 0; color: var(--fg); cursor: pointer; }
.mobile-menu__close svg { width: 26px; height: 26px; }
```

- [ ] **Step 5: Wire the modules in `src/main.tsx`**

Add these two lines at the top of `src/main.tsx`, after the existing imports:

```tsx
import { initChrome } from './shared/chrome';
import { initMotion } from './shared/motion';
```

And at the bottom of the file:

```tsx
initChrome();
initMotion();
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS — including `carries no banned copy`, because the hero section no longer contains `SYSTEM_INITIALIZED`. If it still fails, the old body below the hero still holds `Sector_01` / `LOG_001` strings; that is expected until Task 8, so temporarily skip only the banned-copy assertion and **re-enable it in Task 8 step 1**.

- [ ] **Step 7: Look at it in a browser**

Run: `npm run dev`

Open the local URL and confirm, scrolling slowly through the hero:
- The name passes **between** the trunks — trunks slide across the letters rather than sitting statically on top.
- Both image frames show dashed labelled placeholders (`Hero L1 — canopy-far`, `Hero L3 — trees-back`). That is correct; no images exist yet.
- The hairline tick fills left to right across the bottom.
- At 360px wide the name wraps to two lines and trunks 3 and 6 disappear.
- With OS "reduce motion" on, nothing moves and everything is visible.

- [ ] **Step 8: Commit**

```bash
git add index.html src/styles/home.css src/main.tsx tests/home-hero.test.ts
git commit -m "feat: build the six-layer Home hero with CSS trunks and fog"
```

---

### Task 7: Recolour the flip-board intro and name board

**Files:**
- Modify: `src/styles/intro.css`
- Modify: `src/styles/nameFlip.css`
- Create: `tests/islands-css.test.ts`

**Interfaces:**
- Consumes: tokens from Task 2.
- Produces: nothing new. The React components themselves are untouched — this is a palette change only.

- [ ] **Step 1: Write the failing test**

Create `tests/islands-css.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findHardcodedHex } from '../src/lib/guards';

describe.each(['src/styles/intro.css', 'src/styles/nameFlip.css'])('%s', (path) => {
  const css = readFileSync(path, 'utf8');

  it('carries no colour literals — the islands use tokens like everything else', () => {
    expect(findHardcodedHex(css)).toEqual([]);
  });

  it('has no lime or amber left from the old palette', () => {
    expect(css.toLowerCase()).not.toContain('a4d64c');
    expect(css.toLowerCase()).not.toContain('ffb77d');
    expect(css.toLowerCase()).not.toContain('d97707');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — both files still hold the lime/amber palette.

- [ ] **Step 3: Recolour both stylesheets**

In `src/styles/intro.css` and `src/styles/nameFlip.css`, replace every colour literal with a token:

| Old role | Replace with |
|---|---|
| page/backdrop black | `var(--bg-deep)` |
| flip-cell face | `var(--surface)` |
| flip-cell edge / divider | `var(--border)` |
| character glyph | `var(--fg)` |
| lime highlight `#a4d64c` | `var(--accent-2)` |
| amber `#ffb77d` / `#d97707` | `var(--accent)` — only if the element is clickable; otherwise `var(--accent-2)` |

Add `@import './tokens.css';` as the first line of each file so they resolve standalone.

Add the canopy image behind the intro board, in `src/styles/intro.css`:

```css
.intro-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: url('/assets/img/canopy-far.webp');
  background-size: cover;
  background-position: center;
  opacity: 0.22;
}
.intro-board { position: relative; z-index: 1; }
```

If `.intro-backdrop` does not exist in `src/components/IntroAnimation.tsx`, add a single `<div className="intro-backdrop" aria-hidden="true" />` as the first child of the intro root element. This is the only component change in this task.

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Confirm in the browser**

Run: `npm run dev`, then open a **new tab** to the local URL — the intro plays once per tab session, so a reload will not replay it. Confirm the board reads in bone/clay against the dark ground and the canopy sits faintly behind it (a flat dark backdrop is correct until the image exists).

- [ ] **Step 6: Commit**

```bash
git add src/styles/intro.css src/styles/nameFlip.css src/components/IntroAnimation.tsx tests/islands-css.test.ts
git commit -m "style: recolour flip-board intro and name board to Overgrowth tokens"
```

---

### Task 8: Home body — About, Thesis, Selected work, Experience, Elsewhere, Contact

**Files:**
- Modify: `index.html` (everything after the hero `</section>`)
- Modify: `src/styles/home.css`
- Modify: `tests/home-hero.test.ts` → re-enable the banned-copy assertion
- Create: `tests/home-content.test.ts`
- Delete: `src/styles/site.css`, `src/shared/site.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–6.
- Produces: the finished Home page. Plan 2 reuses `.site-header`, `.mobile-menu`, `.work-row` and `.panel` markup patterns verbatim.

**All copy below is final and traces to the résumé.** Do not paraphrase it, and do not add numbers that are not here.

- [ ] **Step 1: Re-enable the banned-copy assertion**

In `tests/home-hero.test.ts`, remove any `.skip` added in Task 6 step 6, so `carries no banned copy` runs again.

- [ ] **Step 2: Write the failing content test**

Create `tests/home-content.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');

describe('Home content', () => {
  it('has all six body sections', () => {
    for (const id of ['about', 'thesis', 'work', 'experience', 'elsewhere', 'contact']) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('carries the résumé metrics verbatim', () => {
    expect(html).toContain('$8,000');
    expect(html).toContain('40 hours a month');
    expect(html).toContain('same-day');
    expect(html).toContain('$12,000');
  });

  it('uses the correct email', () => {
    expect(html).toContain('yosefpilip@gmail.com');
    expect(html).not.toContain('hello@yosefpilip.com');
  });

  it('drops the roles and claims the résumé does not support', () => {
    expect(html).not.toContain('Aztec Robotics');
    expect(html).not.toContain('Russian — Native');
    expect(html).not.toContain('Apali');
  });

  it('does not publish a location — the owner declined to give one', () => {
    // A dash would imply a value is coming. There isn't one, so the row is gone.
    expect(html).not.toMatch(/<dt[^>]*>Based<\/dt>/);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — sections missing, old copy present.

- [ ] **Step 4: Replace the body below the hero**

Replace everything in `index.html` between the hero's closing `</section>` and `</main>` with:

```html
    <!-- ── ABOUT ── -->
    <section class="section" id="about">
      <div class="container split-7-5">
        <div class="reveal">
          <h2>Most of what I build starts with someone&rsquo;s annoying week.</h2>
          <p>A three-day email chain. Forty hours a month of clicking through accounts one at a time. A process nobody defends but everybody follows. I like taking those apart.</p>
          <p>I&rsquo;m a computer science student at San Diego State, and the work I chase has a physical edge on it &mdash; a wall, an NFC chip, a phone held up at arm&rsquo;s length. That&rsquo;s what Cache It is, and it&rsquo;s the kind of problem I want more of.</p>
        </div>
        <dl class="spec reveal">
          <dt>School</dt>
          <dd>San Diego State University<br /><span class="meta">B.S. Computer Science, 2028</span></dd>
          <dt>Now</dt>
          <dd>AI Software Developer<br /><span class="meta">CloudGeometry</span></dd>
          <dt>Building</dt>
          <dd><a class="link" href="/projects/cache-it">Cache It</a><br /><span class="meta">Zip Launchpad, Fall 2026</span></dd>
        </dl>
      </div>
    </section>

    <!-- ── THESIS: three-layer stack ── -->
    <section class="stack" id="thesis">
      <div class="stack-view">
        <div class="plate plate--back">
          <figure class="frame" style="--ar: 4 / 5; height: 100%;" data-label="Thesis — server-moss">
            <img src="/assets/img/server-moss.webp" alt="Moss and roots growing through an abandoned server rack" loading="lazy" />
          </figure>
        </div>
        <div class="plate plate--copy">
          <p class="display">Software keeps reaching for the physical world.</p>
          <p class="lede">When part of the problem lives outside the browser, the engineering gets harder and the design has to get honest.</p>
        </div>
        <div class="plate plate--front">
          <figure class="frame" style="--ar: 4 / 5; height: 100%;" data-label="Thesis front — roots-overlay">
            <img src="/assets/img/roots-overlay.webp" alt="" loading="lazy" />
          </figure>
        </div>
      </div>
    </section>

    <!-- ── SELECTED WORK ── -->
    <section class="section" id="work">
      <div class="container">
        <h2 class="reveal">Selected work</h2>
        <div class="work-list">

          <a class="work-row reveal" href="/projects/cache-it">
            <span class="work-row__year meta">2026</span>
            <span class="work-row__name">Cache It</span>
            <span class="work-row__hook">Hidden art around a city. Find it, tap it, keep it.</span>
            <span class="work-row__go" aria-hidden="true">&rarr;</span>
          </a>

          <a class="work-row reveal" href="/projects.html#podcast-generator">
            <span class="work-row__year meta">2026</span>
            <span class="work-row__name">Batch Podcast Generator</span>
            <span class="work-row__hook">100-episode runs from a prompt, without melting the API.</span>
            <span class="work-row__go" aria-hidden="true">&rarr;</span>
          </a>

          <a class="work-row reveal" href="/projects.html#cloudgeometry">
            <span class="work-row__year meta">2025&ndash;</span>
            <span class="work-row__name">CloudGeometry internal tools</span>
            <span class="work-row__hook">The Slack bot, the HR platform, and the thing that audits everyone&rsquo;s account.</span>
            <span class="work-row__go" aria-hidden="true">&rarr;</span>
          </a>

        </div>
        <p class="reveal"><a class="btn btn--quiet" href="/projects.html">See everything &rarr;</a></p>
      </div>
    </section>

    <!-- ── EXPERIENCE ── -->
    <section class="section section--tight" id="experience">
      <div class="container">
        <h2 class="reveal">Experience</h2>

        <article class="exp reveal">
          <header class="exp__head">
            <h3 class="exp__role">AI Software Developer</h3>
            <p class="meta">CloudGeometry &middot; May 2025 &ndash; Present</p>
          </header>
          <p>Nobody should have to write a formal email to say they&rsquo;re sick. Now they tell Slack in whatever words they&rsquo;d actually use, and a bot I built in Python on the Gemini API works out what they meant, files it as a real record, and goes to find their manager. Three days became same-day, for about 100 people.</p>
          <p>I also modelled a four-tier permission system and built the internal HR app on top of it, which replaced a paid third-party tool and saves <strong>$8,000</strong> a year. And a scheduled Apps Script service audits every account for 2FA, recovery info and profile photos, then logs what it finds &mdash; <strong>40 hours a month</strong> of manual review across ~100 accounts, gone.</p>
        </article>

        <article class="exp reveal">
          <header class="exp__head">
            <h3 class="exp__role">Events &amp; External Relations Manager</h3>
            <p class="meta">Alpha Epsilon Pi &middot; May 2025 &ndash; Dec 2025</p>
          </header>
          <p>Ran a 50-person team across construction, logistics and creative on a <strong>$12,000</strong> budget. 400+ people through the door per event, roughly double the previous years&rsquo; average, mostly by partnering with other campus organisations instead of shouting louder.</p>
        </article>

        <article class="exp reveal">
          <header class="exp__head">
            <h3 class="exp__role">Operations &amp; Web Development Lead</h3>
            <p class="meta">Hillel Business Initiative, SDSU &middot; Jul 2025 &ndash; Dec 2025</p>
          </header>
          <p>Replaced manual sign-in with a self-updating pipeline, so organisers could watch member engagement live instead of reconstructing it afterwards. Automated the member comms and event ops around it too.</p>
        </article>

        <article class="exp reveal">
          <header class="exp__head">
            <h3 class="exp__role">Head Counselor</h3>
            <p class="meta">Tzofim North America &middot; Aug 2021 &ndash; Jun 2024</p>
          </header>
          <p>Led a 35-person team that set up and broke down large events in half the time, by reorganising who did what rather than asking anyone to move faster.</p>
        </article>

        <div class="panel panel--tint reveal">
          <h3>Education</h3>
          <p><strong>San Diego State University</strong> &mdash; B.S. Computer Science, Aug 2024 &ndash; Jun 2028 expected. GPA 3.8.</p>
          <p><strong>Homestead High School &amp; De Anza College</strong> &mdash; dual enrollment, graduated 2024. GPA 3.8. Manufacturing engineering at De Anza: CAD and SolidWorks, 3D printing across FDM, VAT and powder-bed fusion, CNC machining and manual metalwork &mdash; designing and manufacturing working parts end to end.</p>
        </div>
      </div>
    </section>

    <!-- ── ELSEWHERE ── -->
    <section class="section section--tight" id="elsewhere">
      <div class="container">
        <h2 class="reveal">Elsewhere</h2>
        <div class="lives">

          <a class="life reveal" href="/projects.html">
            <figure class="frame" style="--ar: 4 / 5;" data-label="Life — life-build">
              <img src="/assets/img/life-build.webp" alt="A laptop and mechanical keyboard on a dark desk" loading="lazy" />
            </figure>
            <h3>Build</h3>
            <p>Python and React, mostly. Things that remove a step somebody hated.</p>
          </a>

          <a class="life reveal" href="/music.html">
            <figure class="frame" style="--ar: 4 / 5;" data-label="Life — life-decks">
              <img src="/assets/img/life-decks.webp" alt="A DJ mixer in low warm light" loading="lazy" />
            </figure>
            <h3>DJ</h3>
            <p>I play as Recursion &mdash; tech house, summer and dub-leaning. A room either moves or it doesn&rsquo;t, and you know inside eight bars.</p>
          </a>

          <a class="life reveal" href="/workshop.html">
            <figure class="frame" style="--ar: 4 / 5;" data-label="Life — life-rack">
              <img src="/assets/img/life-rack.webp" alt="A rack of secondhand clothing against a concrete wall" loading="lazy" />
            </figure>
            <h3>Workshop</h3>
            <p>Thrift it, fix it, sell it. Plus CAD, 3D printing, CNC and metalwork from a manufacturing programme at De Anza.</p>
          </a>

        </div>
      </div>
    </section>

    <!-- ── CONTACT ── -->
    <section class="section" id="contact">
      <div class="container">
        <div class="panel panel--tint contact reveal">
          <h2>Say hi.</h2>
          <p class="lede">If you&rsquo;re building something with a physical edge on it, I&rsquo;d like to hear about it.</p>
          <p><a class="btn btn--primary" href="mailto:yosefpilip@gmail.com">yosefpilip@gmail.com</a></p>
          <p class="meta contact__links">
            <a class="link" href="https://github.com/yosefPilip" target="_blank" rel="noopener">GitHub</a>
            <a class="link" href="https://www.linkedin.com/in/yosefpilip/" target="_blank" rel="noopener">LinkedIn</a>
            <a class="link" href="https://soundcloud.com/recursion-mp3" target="_blank" rel="noopener">SoundCloud</a>
          </p>
        </div>
      </div>
    </section>
```

And replace the footer with:

```html
  <footer class="site-footer">
    <div class="container site-footer__inner">
      <span class="meta">&copy; 2026 Yosef Pilip</span>
      <span class="meta">Built by hand</span>
    </div>
  </footer>
```

Finally, remove the old `<script type="module" src="/src/shared/site.ts"></script>` tag. `src/main.tsx` is now the only entry.

- [ ] **Step 5: Add the Home section styles**

Append to `src/styles/home.css`:

```css
/* ── about spec list ── */
.spec { display: grid; grid-template-columns: auto 1fr; gap: 10px 20px; align-content: start; }
.spec dt { font-family: var(--font-mono); font-size: var(--step-meta); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); padding-top: 3px; }
.spec dd { color: var(--fg-dim); }

.link { color: var(--accent); }
.link:hover { color: var(--accent-press); }

/* ── selected work rows ── */
.work-list { margin-block: clamp(28px, 4vw, 56px); border-top: 1px solid var(--border); }
.work-row {
  display: grid;
  grid-template-columns: 5rem 1fr auto;
  gap: 6px 24px;
  align-items: baseline;
  padding-block: clamp(20px, 2.4vw, 32px);
  border-bottom: 1px solid var(--border);
  transition: background-color 0.2s ease;
}
.work-row:hover { background: color-mix(in oklab, var(--fg) 4%, transparent); }
.work-row:hover .work-row__year { color: var(--accent-2); }
.work-row__name { font-family: var(--font-display); font-size: var(--step-h2); }
.work-row__hook { grid-column: 2; color: var(--fg-dim); }
.work-row__go { color: var(--accent); font-size: 20px; }
@media (max-width: 700px) {
  .work-row { grid-template-columns: 1fr auto; }
  .work-row__year { grid-column: 1; }
  .work-row__hook { grid-column: 1 / -1; }
}

/* ── experience ── */
.exp { padding-block: clamp(24px, 3vw, 40px); border-bottom: 1px solid var(--border); }
.exp__head { margin-bottom: 14px; }
.exp__role { font-family: var(--font-display); font-size: var(--step-h2); }
.exp + .panel { margin-top: clamp(32px, 4vw, 56px); }

/* ── lives: three panels, never a uniform grid elsewhere on the page ── */
.lives { display: grid; gap: clamp(16px, 2.5vw, 28px); margin-top: clamp(24px, 3vw, 44px); }
@media (min-width: 820px) { .lives { grid-template-columns: repeat(3, 1fr); } }
.life h3 { font-family: var(--font-display); font-size: var(--step-h2); margin-top: 16px; }
.life p { color: var(--fg-dim); margin-top: 6px; }
.life:hover h3 { color: var(--accent-2); }

/* ── contact ── */
.contact { text-align: left; }
.contact .btn { margin-top: 20px; }
.contact__links { display: flex; gap: 20px; margin-top: 22px; }

/* ── footer ── */
.site-footer { background: var(--bg-deep); border-top: 1px solid var(--border); padding-block: 28px; }
.site-footer__inner { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
```

- [ ] **Step 6: Delete the dead files**

```bash
git rm src/styles/site.css src/shared/site.ts
```

- [ ] **Step 7: Run everything**

Run: `npm test && npx tsc -b --noEmit && npm run build && npm run lint`
Expected: all tests PASS (including the re-enabled banned-copy check), no type errors, clean build, no lint errors.

> The build will warn that `projects.html` and `music.html` still reference the deleted `/src/styles/site.css`. That is expected and is fixed in Plans 2 and 3. If the build **fails** rather than warns, add a temporary `src/styles/site.css` containing only `@import './base.css';` and delete it in Plan 3 Task 6.

- [ ] **Step 8: Verify in the browser at every breakpoint**

Run: `npm run dev`, then check 360 / 390 / 430 / 600 / 744 / 768 / 1024 / 1366 / 1440 / 1920:
- No horizontal scroll at any width.
- The hero name fits one line from 745px up. **Check it with fonts blocked too** (DevTools → Network → block `fonts.gstatic.com`) so the Georgia fallback is measured, per spec §4.
- Clay appears only on clickable things: the email button, the `→` arrows, inline links. Count it — at most two visible uses per screen.
- With reduce-motion on, both stacks collapse to static compositions and nothing is hidden.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: rebuild the Home page body on résumé content"
```

---

## Plan 1 self-review

**Spec coverage.** §3 colour → Task 2. §4 type → Tasks 2–3. §5 layout posture → Task 3. §6 motion → Task 4. §7 hero → Tasks 4 and 6. §8.1 Home → Tasks 6–8. §11 copy rules → Tasks 1 and 8. §12 image system → Tasks 3 and 5. §13 build sequence steps 1–3 → this plan. **Deferred by design:** §8.2/§8.3/§8.4 and §9/§10 are Plans 2–3; §12 generation is Plan 3 Task 7; §15's cross-page checks run in Plan 3 Task 6.

**Known gap carried forward:** `index.html` links to `/workshop.html` and `/projects/cache-it`, which do not exist until Plans 2 and 3. Those are dead links between plans. Plan 3 Task 6 includes a link-integrity test that will catch any that are still broken at the end.

**Type consistency.** `computeStackProgress(rectTop, rectHeight, viewportHeight)` is called with exactly that signature in `motion.ts`. `markMissing`/`sweepLoadedImages`/`installImageFallback` match between `imageFrame.ts`, its tests, and `chrome.ts`. `findForbiddenCopy`/`findHardcodedHex` match across `guards.ts` and all four test files that import them. `initChrome()` and `initMotion()` take no arguments and are called that way in `main.tsx`.
