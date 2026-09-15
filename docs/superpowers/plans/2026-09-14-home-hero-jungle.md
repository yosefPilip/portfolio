# Home Hero Jungle Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Home's hero as a sunlit tropical jungle whose layers composite cleanly, whose front foliage never swallows the wordmark, and whose images are chosen from cheap explorations instead of bought as finals.

**Architecture:** Only the far plate stays an opaque photograph; every layer above it becomes an opaque image on pure white composited with `mix-blend-mode: multiply`, which removes alpha matting — and therefore halos — entirely. Plates are renamed to encode depth, a Playwright filmstrip turns scroll motion into images a human can judge, and every generated file passes a numeric gate before it is accepted.

**Tech Stack:** Vite 8 multi-page, TypeScript 6, React 19 islands, Lenis scroll, Vitest + jsdom, Playwright (new devDependency), Python + Pillow/NumPy for image gates.

**Spec:** `docs/superpowers/specs/2026-09-14-home-hero-jungle-design.md`
**Queue for later rooms:** `docs/image-rooms-queue.md`

**Starting state:** branch `portfolio-overgrowth-rebuild` at `06a1fb3`, with **uncommitted work from an abandoned session** in `index.html`, `src/styles/stack.css`, `tests/frames.test.ts`, `tests/home-hero.test.ts` and `music.html`, plus four untracked `.webp` files. Task 2 deals with this explicitly — do not `git checkout` anything before reading it.

---

## Global Constraints

Copied verbatim from the project's CLAUDE.md and the spec. Every task's requirements include these.

- **Colour literals live ONLY in `src/styles/tokens.css`.** Every other stylesheet uses `var()` or `color-mix()`. Swept by `tests/base-css.test.ts`.
- **Only `transform` and `opacity` animate.** Nothing else goes in a transition or is driven by `--p`.
- **`--fg` is bone `#f0efe9`, never pure white. `--accent` is clay `#cf6b3e` and marks clickable things only.**
- **Green lives in photography, never in UI chrome.** If interface chrome turns green, the concept has broken.
- **No shadows used as fake light.** A zero-blur focus ring is a focus ring, not a shadow.
- **Never skip, weaken or `.skip()` a test.** The gate runs on every task.
- **Browser-verify with real events** (`page.mouse.wheel()`), never programmatic `.click()` or `scrollTo`.
- **Dev server port for this project is 5174.** Run `devservers list` first and reuse it if it is already listening; otherwise start it pinned: `npm run dev -- --port 5174 --strictPort`.
- **`assets/img/workshop/` is nine photographs the owner took.** Never generate, replace, re-export or grade them.
- **No deploy.** Outward-facing actions stop and ask.
- **Image spend stops and asks.** Tasks 4 and 5 contain hard stops. Do not cross one without an explicit yes.

**Gate — all four green before any task is done:**

```
npm test && npx tsc -b --noEmit && npm run lint && npm run build
```

---

### Task 1: The filmstrip — build the eyes before changing anything

**Why first:** every later judgement in this plan depends on being able to *see* scroll. The bugs this plan fixes survived because verification measured bounding rects instead of looking at the page. Building this first also captures a "before" baseline worth keeping.

**Files:**
- Create: `tools/filmstrip.mjs`
- Modify: `package.json` (devDependency + script)

**Interfaces:**
- Consumes: nothing.
- Produces: `node tools/filmstrip.mjs [url] [selector] [outDir]` → writes `<outDir>/desktop.png` and `<outDir>/phone.png`, each a labelled horizontal strip of 8 frames. Defaults: `http://localhost:5174/`, `#hero`, `scratchpad/filmstrip`.

- [ ] **Step 1: Install Playwright as a devDependency**

```bash
npm install -D playwright
npx playwright install chromium
```

Dev-only; it never ships in `dist/`.

- [ ] **Step 2: Write `tools/filmstrip.mjs`**

```js
/**
 * Turn a scroll-driven stack into one image a human can judge.
 *
 * Drives the page with REAL wheel events (never scrollTo — Lenis's virtual
 * scroll ignores programmatic jumps, and the gap between the two is exactly
 * what let an unscrollable overlay ship once already). Captures N frames
 * across the stack's runway, then tiles them in a throwaway page so the
 * output is a single PNG with no extra image dependency.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:5174/';
const selector = process.argv[3] ?? '#hero';
const outDir = process.argv[4] ?? 'scratchpad/filmstrip';
const FRAMES = 8;
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600); // let the intro island settle

  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`selector ${selector} not found at ${url}`);
  const runway = Math.max(0, box.height - vp.height);

  const shots = [];
  for (let i = 0; i < FRAMES; i += 1) {
    const target = box.y + (runway * i) / (FRAMES - 1);
    // Converge on the target with real wheel bursts; Lenis eases, so this
    // takes several passes and never lands exactly. 4px is close enough.
    for (let guard = 0; guard < 60; guard += 1) {
      const current = await page.evaluate(() => window.scrollY);
      const delta = target - current;
      if (Math.abs(delta) <= 4) break;
      await page.mouse.wheel(0, Math.max(-400, Math.min(400, delta)));
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(250); // let momentum die before the shutter
    const scrollY = await page.evaluate(() => Math.round(window.scrollY));
    shots.push({ b64: (await page.screenshot()).toString('base64'), scrollY });
  }
  await page.close();

  const tileW = 240;
  const tileH = Math.round((tileW * vp.height) / vp.width);
  const tiler = await browser.newPage({
    viewport: { width: FRAMES * (tileW + 8) + 40, height: tileH + 90 },
  });
  await tiler.setContent(`<body style="margin:0;background:#141414;display:flex;gap:8px;padding:20px;align-items:flex-start">
    ${shots
      .map(
        (s, i) => `<figure style="margin:0;flex:0 0 ${tileW}px">
        <img src="data:image/png;base64,${s.b64}" style="width:${tileW}px;display:block">
        <figcaption style="color:#999;font:11px ui-monospace,monospace;text-align:center;padding-top:6px">
          ${Math.round((i * 100) / (FRAMES - 1))}% · y=${s.scrollY}
        </figcaption></figure>`,
      )
      .join('')}
  </body>`);
  await tiler.screenshot({ path: path.join(outDir, `${vp.name}.png`), fullPage: true });
  await tiler.close();
  console.log(`${vp.name}: ${path.join(outDir, `${vp.name}.png`)}`);
}

await browser.close();
```

- [ ] **Step 3: Add the npm script**

In `package.json` `"scripts"`, after `"test:watch"`:

```json
    "filmstrip": "node tools/filmstrip.mjs"
```

- [ ] **Step 4: Capture the "before" baseline**

Check the server first, per the Global Constraints:

```bash
devservers list
# if 5174 is not listening:
npm run dev -- --port 5174 --strictPort
```

Then:

```bash
npm run filmstrip -- http://localhost:5174/ '#hero' scratchpad/filmstrip-before
```

Expected: two PNGs written. **Open both and look at them.** Confirm you can see the three bugs the spec describes — the canopy band drifting down, the front trunks over the wordmark, the layers not blending. If the filmstrip does not make those visible, it is not doing its job; fix it before continuing.

- [ ] **Step 5: Verify the gate and commit**

```bash
npm test && npx tsc -b --noEmit && npm run lint && npm run build
```

Expected: all four green (this task adds no source files that tests cover).

```bash
git add tools/filmstrip.mjs package.json package-lock.json
git commit -m "tools: capture scroll stacks as a filmstrip so motion can be judged by eye"
```

Do **not** commit `scratchpad/`.

---

### Task 2: Rebuild the hero's layer architecture

**Why:** two opaque full-bleed photographs cannot stack — the upper hides the lower, which is what forced the mask, and the mask is the visible seam. Only the far plate stays opaque. The abandoned session's alpha-cutout experiment is reverted, including the tests that lock it in.

**Files:**
- Modify: `index.html:47-75` (the hero stack)
- Modify: `src/styles/stack.css:38-112` (hero plate rules)
- Modify: `tests/home-hero.test.ts`
- Create: `tests/stack-depth.test.ts`
- Delete: `assets/img/canopy-far.webp`, `assets/img/trees-back.webp`, `assets/img/trunks-near.webp`

**Interfaces:**
- Consumes: `tools/filmstrip.mjs` from Task 1.
- Produces: plate classes `.plate--far` (z1), `.plate--fog` (z2), `.plate--mid` (z3), `.plate--name` (z4), `.plate--near` (z5), `.plate--low` (z6); image paths `assets/img/jungle-far.webp`, `jungle-mid.webp`, `jungle-near.webp`. Tasks 4 and 5 generate into exactly these paths.

- [ ] **Step 1: Delete the three superseded images**

```bash
rm -f assets/img/canopy-far.webp assets/img/trees-back.webp assets/img/trunks-near.webp
```

All three are untracked, so a plain `rm` is the whole job — nothing to unstage. `server-moss.webp` stays: it belongs to the thesis stack and is out of scope.

- [ ] **Step 2: Update the hero markup**

Replace `index.html` lines 47–75 (the six plates inside `<div class="stack-view">`) with:

```html
        <div class="plate plate--far" aria-hidden="true">
          <figure class="frame" data-label="Hero L1 — jungle-far">
            <img src="/assets/img/jungle-far.webp" alt="" loading="eager" />
          </figure>
        </div>

        <div class="plate plate--fog" aria-hidden="true"></div>

        <div class="plate plate--mid" aria-hidden="true">
          <figure class="frame" data-label="Hero L3 — jungle-mid">
            <img src="/assets/img/jungle-mid.webp" alt="" loading="eager" />
          </figure>
        </div>

        <div class="plate plate--name">
          <h1 class="hero-wordmark">Yosef Pilip</h1>
        </div>

        <div class="plate plate--near" aria-hidden="true">
          <figure class="frame" data-label="Hero L5 — jungle-near">
            <img src="/assets/img/jungle-near.webp" alt="" loading="eager" />
          </figure>
        </div>

        <div class="plate plate--low" aria-hidden="true"></div>
```

- [ ] **Step 3: Replace the hero block in `src/styles/stack.css`**

**This is two separate edits, not one.** The hero block is interleaved: plate rules, then the wordmark and its gradients, then the trunk rules. Only the first and last sections change.

**Edit A — replace lines 38–61**, from `/* ── the hero: six layers, Home only ── */` down to and including `.hero .plate--low { z-index: 6; --rate: -440; }`, with:

```css
/* ── the hero: six layers, Home only ──
   Names encode DEPTH, not species. The previous names did not, and that is
   how a canopy — the nearest thing in frame, directly overhead — ended up
   assigned the slowest rate in the stack with nothing to make the
   contradiction visible. far/mid/near cannot drift from their rates without
   reading as obviously wrong. Guarded by tests/stack-depth.test.ts. */
.hero { --stack-h: 260vh; }
.hero .plate--far  { z-index: 1; --rate: -60; }
.hero .plate--fog  { z-index: 2; --rate: -120; }
.hero .plate--mid  { z-index: 3; --rate: -190; }
.hero .plate--name { z-index: 4; --rate: -250; display: grid; place-content: center; }
.hero .plate--near { z-index: 5; --rate: -350; }
.hero .plate--low  { z-index: 6; --rate: -440; }

/* Only .plate--far is an opaque photograph. Everything above it ships opaque
   on pure white and is composited arithmetically: result = backdrop x source,
   so white vanishes and darks stay. No alpha channel exists, therefore no
   matte and no halo — which matters because the subjects here are fronds and
   mist, thousands of thin semi-transparent edges, the exact case alpha
   matting handles worst and multiply handles best. The previous cutout
   arrived haloed at +24 RGB and needed hand un-matting; see spec §3.1.

   The blend goes on the PLATE, never the .frame inside it: .plate sets
   will-change: transform, which creates a stacking context, so a blend on the
   frame would composite only against its own plate and do nothing. Same
   pattern as the working precedent at workshop.css:24. */
.hero .plate--mid,
.hero .plate--near { mix-blend-mode: multiply; }

/* .frame paints var(--bg-deep) so a missing image reads as a dark labelled
   placeholder. Under multiply an opaque dark ground would crush the whole
   hero to black, so these two frames stay transparent. */
.hero .plate--mid .frame,
.hero .plate--near .frame { background: transparent; }

/* While a slot is still empty the labelled placeholder must stay legible, so
   the blend switches off for that plate rather than multiplying a dashed
   border into the forest. Restores itself the moment a real file lands. */
.hero .plate--mid:has(.frame.is-missing),
.hero .plate--near:has(.frame.is-missing) { mix-blend-mode: normal; }
```

That replacement already drops the `.plate--trees` mask, which lived inside this range and was the visible seam.

**Edit B — delete lines 91–112 entirely**: the `/* ── the front trunks: a real photograph with a real alpha channel ── */` comment block and the `.hero .plate--trunks .frame { background: transparent; }` rule it introduces. Both describe the reverted approach, and the transparent-frame rule is superseded by the `.plate--mid` / `.plate--near` rules in Edit A.

**Leave lines 63–89 untouched** — `.hero-wordmark` and the `::after` gradients on `.plate--fog` / `.plate--low`. They are between the two edits and nothing in this plan changes them.

- [ ] **Step 4: Update the responsive rates**

In the `@media` block near line 141, rename to match:

```css
  .hero .plate--far  { --rate: -36; }
  .hero .plate--fog  { --rate: -70; }
  .hero .plate--mid  { --rate: -110; }
  .hero .plate--name { --rate: -150; place-content: center start; padding-inline: var(--gutter); }
  .hero .plate--near { --rate: -215; }
  .hero .plate--low  { --rate: -270; }
```

- [ ] **Step 5: Write the depth guard**

Create `tests/stack-depth.test.ts`:

```ts
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
```

- [ ] **Step 6: Run it and watch it fail**

```bash
npx vitest run tests/stack-depth.test.ts
```

Expected: FAIL before Steps 3–4 are applied; PASS after. If you applied the CSS first, confirm by temporarily reverting one rate.

- [ ] **Step 7: Fix the hero tests that lock in the alpha approach**

In `tests/home-hero.test.ts`:

Replace the `'builds the six hero layers'` layer list:

```ts
  it('builds the six hero layers', () => {
    for (const layer of ['far', 'fog', 'mid', 'name', 'near', 'low']) {
      expect(html).toContain(`plate--${layer}`);
    }
  });
```

**Delete two tests outright** — they assert the opposite of this design:
- `'fills the front trunk plate with the cut-out photograph, not CSS bars'`
- `'ships the front trunks with a real alpha channel, or they are an opaque rectangle over the wordmark'`

Replace `'keeps the trunk layer sparse enough that the wordmark still reads'` with:

```ts
  it('keeps the front plate above the wordmark but composited, not opaque', () => {
    // The front layer is meant to cross the name and show the forest through
    // the gaps. It does that by multiply, not by an alpha channel: a cutout
    // of fronds halos, and the previous one measured +24 RGB at the edges.
    const stack = readFileSync('src/styles/stack.css', 'utf8');
    expect(stack).toMatch(/\.hero \.plate--near \{[^}]*z-index:\s*5/);
    expect(stack).toMatch(/\.hero \.plate--near \{[^}]*--rate:\s*-350/);
    expect(stack).toMatch(/mix-blend-mode: multiply/);
  });
```

Remove the now-unused `existsSync` from the import on line 2:

```ts
import { readFileSync } from 'node:fs';
```

- [ ] **Step 8: Run the full suite**

```bash
npm test
```

Expected: all green. `tests/frames.test.ts` already expects **5** plate figures on `index.html` and still should — three hero plates plus the thesis stack's two — so it needs no change.

- [ ] **Step 9: Look at it**

```bash
npm run filmstrip -- http://localhost:5174/ '#hero' scratchpad/filmstrip-after
```

**Open `desktop.png` and `phone.png` and compare against `scratchpad/filmstrip-before`.** Expected: three labelled placeholders moving at visibly different rates, no canopy band, no seam, nothing covering the wordmark. The hero is deliberately image-less at this point — that is the designed fallback, not a failure.

- [ ] **Step 10: Run the gate and commit**

```bash
npm test && npx tsc -b --noEmit && npm run lint && npm run build
```

```bash
git add index.html src/styles/stack.css tests/home-hero.test.ts tests/stack-depth.test.ts tests/frames.test.ts
git commit -m "feat: rebuild the hero on one opaque plate and two multiply layers"
```

---

### Task 3: The generation gates

**Why:** $1.50 was spent on finals the owner never chose, and the grade script that defines how the set looks lived only in a session scratchpad and was nearly lost. Both are process failures with file-shaped fixes.

**Files:**
- Create: `docs/image-slots.md`
- Create: `tools/checkplate.py`
- Verify tracked: `tools/grade.py` (already rescued into the repo)

**Interfaces:**
- Consumes: nothing.
- Produces: `python tools/checkplate.py <path>` → prints size, corner RGB mean and min, and wordmark-band coverage percentage. Tasks 4 and 5 run this on every render before accepting it.

- [ ] **Step 1: Write `tools/checkplate.py`**

```python
"""Gate a generated plate before it is accepted.

Two numbers decide whether a render is usable, and both were learned the
expensive way:

  corner RGB  A multiply layer's background must be pure white. An off-white
              or vignetted ground leaves a grey wash over everything behind
              it and misreads as "the blend doesn't work" (Plan 4 Ruling 7).

  coverage    The fraction of non-white pixels in the band where the wordmark
              sits. The previous front plate covered most of the owner's name.
              Cap is 25%, measured rather than judged by eye.
"""
import sys
import numpy as np
from PIL import Image

# Mobile safe band: at 390x844 the plate is 398x1047 and a 3:2 source keeps
# only its centre 25.3% of width. Anything outside 37.5%-62.5% is gone.
BAND_X = (0.375, 0.625)
BAND_Y = (0.40, 0.62)
WHITE = 250
CAP = 0.25


def report(path, band_x=BAND_X, band_y=BAND_Y):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    h, w, _ = a.shape
    c = 40
    corners = np.concatenate([
        a[:c, :c].reshape(-1, 3), a[:c, -c:].reshape(-1, 3),
        a[-c:, :c].reshape(-1, 3), a[-c:, -c:].reshape(-1, 3),
    ])
    x0, x1 = int(w * band_x[0]), int(w * band_x[1])
    y0, y1 = int(h * band_y[0]), int(h * band_y[1])
    coverage = float((a[y0:y1, x0:x1].min(axis=2) < WHITE).mean())

    print(f'{path}')
    print(f'  size                {w}x{h}')
    print(f'  corner mean RGB     {corners.mean(axis=0).round(1).tolist()}')
    print(f'  corner min RGB      {corners.min(axis=0).tolist()}')
    print(f'  wordmark coverage   {coverage * 100:.1f}%   cap {CAP * 100:.0f}%')
    if corners.min() < WHITE:
        print('  WARNING: background is not pure white — push the white point '
              'before judging any composite.')
    if coverage > CAP:
        print('  WARNING: over the coverage cap — this will swallow the name.')
    return coverage


if __name__ == '__main__':
    report(sys.argv[1])
```

- [ ] **Step 2: Verify it runs**

```bash
python tools/checkplate.py assets/img/server-moss.webp
```

Expected: prints size, corner RGB and a coverage number, plus a not-pure-white warning — `server-moss` is a normal photograph, not a multiply plate, so the warning is correct behaviour and proves the check has teeth.

- [ ] **Step 3: Create the slot manifest**

Create `docs/image-slots.md`:

```markdown
# Image slots

Per-slot state for every generated image on the site. **Update this in the same
commit as any render.** It is what lets a new session resume without re-deriving
decisions or re-buying an image that already exists.

Tier 1 = CSS, no image. Tier 2 = opaque on flat white/black + blend. Tier 3 =
true alpha (avoid; halos on soft edges).

## Home — hero

| Slot | Role | Tier | Status | Spend | Notes |
|---|---|---|---|---|---|
| `jungle-far` | back, opaque | 1 opaque | placeholder | $0.00 | canopy gap + light at ~60% width; quiet centre-left for the wordmark |
| `jungle-mid` | midground | 2 white→multiply | placeholder | $0.00 | silhouetted palms, no environment |
| `jungle-near` | front | 2 white→multiply | placeholder | $0.00 | left edge only, ≤25% of the wordmark band |

## Home — rest

| Slot | Role | Tier | Status | Spend | Notes |
|---|---|---|---|---|---|
| `server-moss` | thesis back | 1 opaque | **done** | $0.03 | generated 2026-09-14, style anchor for the old spruce set |
| `roots-overlay` | thesis front | 2 white→multiply | placeholder | $0.00 | out of scope this sitting |
| `life-build` | panel | 1 opaque | placeholder | $0.00 | out of scope this sitting |
| `life-decks` | panel | 1 opaque | placeholder | $0.00 | out of scope this sitting |
| `life-rack` | panel | 1 opaque | placeholder | $0.00 | out of scope this sitting |

## Other rooms

See `docs/image-rooms-queue.md`. All placeholders, none planned yet by design.

## Abandoned

| File | Spend | Why |
|---|---|---|
| `canopy-far` | $0.19 | wrong biome (spruce), and structurally hidden behind an opaque plate |
| `trees-back` | $0.83 | wrong biome; rescued in post by rotating hue 200→81, which is the practice this plan bans |
| `trunks-near` | ~$0.45 | Tier 3 alpha cutout, arrived haloed at +24 RGB, needed hand un-matting |

**Running total spent to date: ~$1.50. Recovered: $0.03 (`server-moss`).**
```

- [ ] **Step 4: Confirm `tools/grade.py` is tracked**

```bash
git status --short tools/
```

Expected: both `tools/grade.py` and `tools/checkplate.py` appear as untracked or staged. If `grade.py` is absent the rescue was lost — recover it before continuing; it is the mechanism for set coherence.

- [ ] **Step 5: Commit**

```bash
git add tools/checkplate.py tools/grade.py docs/image-slots.md
git commit -m "tools: gate generated plates on white purity and wordmark coverage"
```

---

### Task 4: Explorations — STOP before any final

**Why:** the owner's explicit instruction. *"Help me make a plan that first makes exploration photos and presents them to me before wasting money on finals that don't even look good."*

**Budget for this task: ~$0.18 total. 2 variants × 3 slots at explore tier. Do not exceed it without a yes.**

**Files:**
- Create: `assets/img/jungle-{far,mid,near}.webp` (one accepted variant each, by the end)
- Modify: `docs/image-slots.md`

**Interfaces:**
- Consumes: slot paths from Task 2, `tools/checkplate.py` and `tools/grade.py` from Task 3, `tools/filmstrip.mjs` from Task 1.
- Produces: three accepted explore-tier images at the slot paths.

- [ ] **Step 1: Read the reference**

Read `docs/refs/home/` — the owner's jungle reference. If it is empty, **stop and ask him for it**; do not generate against a description alone. Sample it and record mean hue, saturation and luminance, plus how contrast falls off with depth. These become the numeric target every render is checked against.

- [ ] **Step 2: Generate at explore tier only, one slot at a time**

Shared lock, prepended to all three prompts:

> 35mm film photograph, dense tropical rainforest, palms and tree ferns, humid mist, wet foliage, volumetric crepuscular light shafts breaking through a high canopy from the upper right, saturated yellow-green where the light lands falling to near-black in shadow, visible film grain, natural colour.
>
> Negative: anamorphic streaks, lens ghosting, HDR, neon, cyberpunk, oversaturated, vaporwave, CGI render, plastic sheen, text, watermark, logo, people, path, trail, visible sky except through the canopy gap.

**The single most important line:** the negative list bans lens *artifacts*, and the positive list *requires* crepuscular rays. Generators routinely read "no flare" as "no shafts" and flatten the light out. Check every render for shafts before anything else.

Per slot, 2 variants each:

- **`jungle-far`** — opaque. Distant layered forest receding into bright humid haze. Canopy gap and its light at **~60% of frame width, not 85%** — beyond that it is cropped off on a phone. No dominant subject; low contrast and quiet across the centre-left where the wordmark sits. Aerial perspective: each further plane lighter and softer.
- **`jungle-mid`** — on **pure white `#ffffff`**, flat and uniform. Silhouetted palm trunks and frond masses, midground only. No environment, no ground, no sky, no horizon.
- **`jungle-near`** — on **pure white `#ffffff`**, flat and uniform. A few large fern and palm frond tips entering from the **left edge only**, under 30% of frame, remainder pure white. Near-black, backlit, minimal internal detail.

Wide 3:2, high resolution. Everything load-bearing inside 37.5%–62.5% of width.

- [ ] **Step 3: Gate every render before looking at it**

```bash
python tools/checkplate.py <render>
```

For `jungle-mid` and `jungle-near`, corner min RGB must be ≥250 or the white point needs pushing first. For `jungle-near`, coverage must be ≤25%. A render that fails the gate is not shown — re-prompt at explore price.

- [ ] **Step 4: Convert and place**

WebP ~q72, written to the slot path. Report dimensions and byte size per file; a 4MB hero is a defect even if it looks right.

- [ ] **Step 5: Composite and capture**

```bash
npm run filmstrip -- http://localhost:5174/ '#hero' scratchpad/explore-<variant>
```

Judge layers **composited, never alone.** A far plate that looks beautiful on its own is usually too busy to sit behind type.

- [ ] **Step 6: HARD STOP — present to the owner**

Present both filmstrips per variant, at both viewports, plus the checkplate numbers and the running spend. Ask which direction to take to final.

**Do not generate a single final image until he answers.** This is the step whose absence caused the problem this plan exists to fix.

- [ ] **Step 7: Record and commit what was accepted**

Update `docs/image-slots.md`: status, spend, and one line on why the accepted variant won.

```bash
git add assets/img/jungle-far.webp assets/img/jungle-mid.webp assets/img/jungle-near.webp docs/image-slots.md
git commit -m "feat: fill the hero's three jungle slots at explore quality"
```

---

### Task 5: Finals and the closing pass

**Do not start this task without an explicit yes from Task 4 Step 6.**

**Files:**
- Modify: `assets/img/jungle-{far,mid,near}.webp`
- Modify: `docs/image-slots.md`

**Interfaces:**
- Consumes: the approved direction from Task 4.
- Produces: final-quality images at the same three paths. No markup or CSS change.

- [ ] **Step 1: Generate finals one at a time, in this order**

`jungle-far` → `jungle-mid` → `jungle-near`. Cheapest decision first: the far plate sets the light and the grade, and both upper layers are judged against it. **Never batch.** If one lands wrong, re-roll that one — do not adjust the other two to match a mistake.

After each: run `tools/checkplate.py`, then `tools/grade.py` **only** for fine matching against the accepted anchor. If a render is the wrong biome, the prompt is wrong — re-roll at explore price. Grading a miss into looking acceptable is what produced the forest the owner rejected.

- [ ] **Step 2: Judge each final in the page before generating the next**

```bash
npm run filmstrip -- http://localhost:5174/ '#hero' scratchpad/final-<slot>
```

- [ ] **Step 3: Verify the wordmark still reads**

At 1440×900 and 390×844, confirm: the wordmark is legible against whatever sits behind it, `jungle-near` covers ≤25% of it, and no horizontal scroll appears at either width. Bone `#f0efe9` over a blown-out highlight is the failure mode to look for.

- [ ] **Step 4: Re-run the checks the images invalidate**

```bash
npm test && npx tsc -b --noEmit && npm run lint && npm run build
```

Then confirm no file exceeds ~500KB:

```bash
ls -la assets/img/jungle-*.webp
```

- [ ] **Step 5: Update the manifest and commit**

```bash
git add assets/img/jungle-far.webp assets/img/jungle-mid.webp assets/img/jungle-near.webp docs/image-slots.md
git commit -m "feat: ship the hero's jungle plates at final quality"
```

- [ ] **Step 6: DO NOT DEPLOY**

The gate being green is not permission to deploy. Vercel and anything outward-facing stops and asks, per CLAUDE.md §7.

- [ ] **Step 7: Hand off**

Report to the owner: final spend against the $0.18 explore budget plus whatever finals he approved, the before/after filmstrips, and anything parked. Note that `docs/image-rooms-queue.md` holds the next six sittings and that the architecture this sitting proved — one opaque plate, multiply above it — now applies to all of them.

---

## Notes for the executor

**Uncommitted work is in the tree at start.** `index.html`, `src/styles/stack.css`, `tests/frames.test.ts` and `tests/home-hero.test.ts` carry an abandoned session's alpha-cutout experiment. Task 2 rewrites all four deliberately. `music.html` and `src/styles/stack.css` also carry unrelated Music colour work from Plan 4 Task 2 — **leave the Music changes alone**; they are someone else's task and are not yours to revert.

**One deviation from the spec worth knowing.** Spec §4.3 calls the coverage cap "a test." It ships as `tools/checkplate.py`, a gate in the generation loop, rather than a Vitest test — asserting it in Vitest would mean adding a JavaScript image decoder as a dependency to check a file that is absent for most of this plan's life. The number is still measured, not judged, and it is recorded in the manifest. The Vitest guards cover the CSS and markup contracts instead.

**If the hero looks wrong after Task 2 and before any image exists, that is correct.** Three labelled dashed placeholders moving at different rates is the designed fallback state.
