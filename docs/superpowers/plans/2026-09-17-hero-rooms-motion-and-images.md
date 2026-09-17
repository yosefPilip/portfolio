# Hero Rooms — Motion and Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the hero stacks on Projects, Music, Home and Workshop — the scroll layers each room needs, and the nine images that fill them.

**Architecture:** Every hero is a `.stack` whose `.stack-view` is sticky; `src/shared/motion.ts` writes one number, `--p` (0→1), onto it each frame and CSS moves plates off that number alone. This plan adds three things to that model: a fourth drifting plate on Projects, a seventh plate on Home, and a `--zoom` custom property that lets Workshop's five plates scale at different rates to read as a camera walking through a door. Depth declarations (`z-index`, `--rate`, `--zoom`) all live in `src/styles/stack.css` so one guard file can see every stack; blend modes and room styling stay in the page stylesheet.

**Tech Stack:** Vite multi-page, hand-written HTML + CSS, Lenis for scroll, TypeScript with `noUnusedLocals`/`noUnusedParameters`/`erasableSyntaxOnly`, Vitest, oxlint. Image tooling is Python: `tools/grade.py` and `tools/checkplate.py` (numpy + Pillow). Scroll verification is `tools/filmstrip.mjs` (Playwright, real `page.mouse.wheel()`).

**Spec:** [`docs/superpowers/specs/2026-09-17-hero-rooms-motion-and-images-design.md`](../specs/2026-09-17-hero-rooms-motion-and-images-design.md)

## Global Constraints

- **Run the whole gate before calling any task done:** `npm test && npx tsc -b --noEmit && npm run lint && npm run build`. All four green. Never `.skip()` a test to move faster.
- **No hardcoded hex anywhere outside `src/styles/tokens.css`.** Everything else is `var()` or `color-mix(in oklab, …)`. No `#000` or `#fff` in any form.
- **Only `transform` and `opacity` may animate.** `top`/`left`/`right`/`bottom`/`width`/`height`/`background-position` are banned from `transition`, `animation` and every `@keyframes` stop. Static declarations of those properties are fine — the ban is on animating them.
- **Any rule that can render at ≥32px carries `letter-spacing`** — negative for normal case, **≥0.06em positive** for `text-transform: uppercase`.
- **`src/styles/layout.generated.css` is generated.** Never hand-edit it expecting the edit to survive; it is rewritten wholesale on every panel Save. Structural CSS a layer depends on goes in the page stylesheet.
- **One opaque plate per stack.** Everything above it ships opaque on pure white and composites with `mix-blend-mode: multiply`, applied to the `.plate` and never the `.frame` (`.plate` sets `will-change: transform`, which creates a stacking context and silently kills a blend on a child). No alpha cutouts. No `screen`.
- **A multiply plate's `.frame` must be `background: transparent`,** or its `--bg-deep` fill crushes everything behind it to black.
- **Mobile safe band:** at 390×844 only the centre 37.5%–62.5% of a 3:2 source survives. Everything load-bearing sits inside it.
- **Spend needs a yes.** No image is generated before the owner approves the slot list and the number. After that yes, **one image at a time**, never a batch. Ceiling for this plan: **$1.55**.
- **`assets/img/workshop/` holds nine photographs the owner took.** Never generate, replace, re-export or grade them.
- **`docs/resume.md` is canon** for every fact and number on the site.
- **Attribution:** end every commit message with `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

---

## File Structure

| File | Responsibility | Tasks |
|---|---|---|
| `src/styles/stack.css` | **All** depth declarations for every stack: `z-index`, `--rate`, `--zoom`, and the shared `.plate` transform. One file so one guard can read them. | 2, 4, 6, 8 |
| `src/styles/projects.css` | Projects room styling: front-plate blend, the haze gradient and its keyframe. | 2 |
| `src/styles/music.css` | Music room styling: front-plate blend and transparent frame. | 4 |
| `src/styles/workshop.css` | Workshop room styling: blends, the doorway clip box, the door hinge, the two-phase opacity handoff. | 8 |
| `projects.html` | Adds the `#ridge` id and the haze plate. | 2 |
| `music.html` | No structural change; `src` restored in task 5. | 5 |
| `index.html` | Adds the `--shrub` plate. | 6 |
| `workshop.html` | Restructures `#arrive` to five plates with a doorway wrapper. | 8 |
| `tests/stack-depth.test.ts` | Generalized from `.hero`-only to every stack scope, plus the `--zoom` ordering rule. | 1 |
| `docs/image-slots.md` | The per-slot ledger. Updated in the same commit as every render. | 3, 5, 7, 9 |
| `docs/image-rooms-queue.md` | The queue. Sittings 3–6 closed out. | 10 |

---

## Task 1: Generalize the depth guards

Today [`tests/stack-depth.test.ts`](../../../tests/stack-depth.test.ts) hardcodes `.hero`, so every plate on Projects, Music and Workshop is completely unguarded — a rate could drift wrong on three pages and nothing would fail. This task generalizes it **before** three rooms' worth of new plates exist to be wrong, and adds the `--zoom` rule that Task 8 will rely on.

**Files:**
- Modify: `tests/stack-depth.test.ts` (whole-file rewrite)

**Interfaces:**
- Consumes: nothing.
- Produces: `parsePlates(source: string): PlateDecl[]` and the scope-grouping behaviour that Tasks 2, 6 and 8 must keep satisfying. Every new plate declaration they add must carry a `z-index` and a `--rate` in the same rule body, under a scope selector, in `src/styles/stack.css`.

**Key design note for the implementer:** a "scope" is the selector text to the left of `.plate--x`. Four scopes will exist when this plan finishes: `` (empty — the base three-plate body stack), `.hero`, `#ridge`, `#arrive`. Rules are grouped by scope and each group is checked independently. The mobile `@media (max-width: 744px)` block redeclares only `--rate`, so mobile depth is looked up by **scope + name** against the desktop declarations.

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `tests/stack-depth.test.ts`:

```ts
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
 * `.split(',').pop()` handles grouped selectors like
 * `.hero .plate--mid,\n.hero .plate--near { … }` — those declare a blend, not
 * a depth, so they are dropped by the `continue` below, but the split keeps
 * the scope correct for any grouped rule that does carry one.
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
      scope: m[1].split(',').pop()!.trim(),
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

  it('composites the hero front plates with multiply, on the plate not the frame', () => {
    expect(css).toMatch(/mix-blend-mode: multiply/);
    expect(css).not.toMatch(/\.plate--\w+ \.frame \{[^}]*mix-blend-mode/);
  });

  it('keeps no alpha-era mask on the hero', () => {
    expect(css).not.toMatch(/\.hero \.plate--\w+ \{[\s\S]{0,200}mask-image/);
  });
});
```

- [ ] **Step 2: Run it and read every failure**

```
npx vitest run tests/stack-depth.test.ts
```

Expected: the `z 1..n` test **fails**. The base scope declares z 1, 2, 3 and `.hero` declares 1–6, both fine — but `.hero .plate--name` is matched by the regex `\.plate--([a-z]+)` while the base `.plate--copy` is too, and both land in different scopes correctly. If instead you see a failure naming a scope you did not expect, the regex is over-matching; fix the regex, not the CSS. Do not change `stack.css` in this task.

- [ ] **Step 3: Get it green against the CSS as it stands today**

No source change should be required — the current `stack.css` already satisfies every rule (base: z1/2/3 at −90/−260/−430; hero: z1–6 at −60/−120/−190/−250/−350/−440). If a test fails, the parser is wrong. Iterate on the test until green.

- [ ] **Step 4: Prove the guard actually bites**

Temporarily edit `src/styles/stack.css` and change `.hero .plate--near { … --rate: -350 }` to `--rate: -100`. Run:

```
npx vitest run tests/stack-depth.test.ts
```

Expected: **FAIL** on "moves nearer layers faster", naming `.hero .plate--near vs --name`. Then `git checkout src/styles/stack.css` and re-run to confirm green. A guard that cannot fail is not a guard.

- [ ] **Step 5: Run the full gate and commit**

```bash
npm test && npx tsc -b --noEmit && npm run lint && npm run build
git add tests/stack-depth.test.ts
git commit -m "test: guard depth ordering on every stack, not just the hero

Projects, Music and Workshop plates were entirely unguarded. Groups plate
declarations by scope selector, checks strict rate increase per scope on
desktop and mobile, requires z 1..n contiguous so an inserted plate cannot
silently collide, and adds the non-decreasing --zoom rule Task 8 needs.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Projects — the four-plate ridge and the drifting haze

**Files:**
- Modify: `src/styles/stack.css` (add the `#ridge` scope, desktop and mobile)
- Modify: `src/styles/projects.css`
- Modify: `projects.html:46-65`
- Test: `tests/stack-depth.test.ts` (must stay green), `tests/base-css.test.ts` (picks the new rules up automatically)

**Interfaces:**
- Consumes: `parsePlates` scope grouping from Task 1 — every plate added here needs `z-index` **and** `--rate` in one rule body under the `#ridge` scope.
- Produces: the `#ridge` id on the Projects hero section, and `.plate--haze` as a plate class with no frame of its own. Task 3 fills `ridge-far` and `ridge-near` behind it.

**Why a whole new scope instead of one extra plate:** inserting the haze at z2 displaces `copy` and `front`, which inherit z2 and z3 from the base `.plate--copy`/`.plate--front` rules used by every body stack on the site. Restating all four under `#ridge` keeps the group contiguous (Task 1's `z 1..n` rule) and means Projects' depth is readable in one place instead of half-inherited.

- [ ] **Step 1: Add the id to the section**

In `projects.html`, line 46:

```html
<section class="stack page-hero" id="ridge">
```

- [ ] **Step 2: Add the haze plate to the markup**

In `projects.html`, between the `plate--back` div and the `plate--copy` div:

```html
        <div class="plate plate--haze" aria-hidden="true"></div>
```

It has no `.frame` and no image — it is decorative atmosphere, the same shape as Home's existing `.plate--fog`.

- [ ] **Step 3: Declare the scope in `stack.css`**

After the `.plate--front` base rule and before the `/* ── the hero ── */` comment block, add:

```css
/* ── Projects' ridge: the base three plus a drifting haze between the
   ridge and the title. Declared as a complete scope rather than patching one
   plate into the base stack — inserting at z2 displaces copy and front, and a
   half-inherited stack is exactly the collision tests/stack-depth.test.ts now
   refuses. ── */
#ridge .plate--back  { z-index: 1; --rate: -90; }
#ridge .plate--haze  { z-index: 2; --rate: -160; pointer-events: none; }
#ridge .plate--copy  { z-index: 3; --rate: -260; }
#ridge .plate--front { z-index: 4; --rate: -430; }
```

`pointer-events: none` matters for the same reason it does on `.plate--fog`: the plate's box is inset −12%/−3% of the sticky viewport and would otherwise swallow every wheel and drag event meant for the layers underneath.

- [ ] **Step 4: Add the mobile rates**

Inside the existing `@media (max-width: 744px)` block in `stack.css`, after the `.hero` rates:

```css
  #ridge .plate--back  { --rate: -54; }
  #ridge .plate--haze  { --rate: -96; }
  #ridge .plate--copy  { --rate: -150; }
  #ridge .plate--front { --rate: -250; }
```

- [ ] **Step 5: Run the depth guard**

```
npx vitest run tests/stack-depth.test.ts
```

Expected: PASS, with `#ridge` now among the scopes. If "z 1..n" fails naming `#ridge`, a plate is missing from the group.

- [ ] **Step 6: Blend the front plate in `projects.css`**

After the existing `.page-hero` rules:

```css
/* The ridge silhouette ships opaque on pure white and is composited
   arithmetically — result = backdrop x source, so white vanishes and the dark
   rock stays. No alpha, therefore no matte and no halo on the snow edges.
   Must target .plate, not .frame: .plate sets will-change: transform, which
   creates a stacking context, and a blend on a descendant only composites
   against that plate's own children. */
#ridge .plate--front { mix-blend-mode: multiply; }

/* .frame paints var(--bg-deep) so a missing image reads as a labelled dark
   box. Under multiply an opaque dark ground would crush the whole hero to
   black. */
#ridge .plate--front .frame { background: transparent; }

/* While the slot is empty the dashed placeholder must stay legible, so the
   blend switches off rather than multiplying a dashed border into the ridge.
   Restores itself the moment a real file lands. */
#ridge .plate--front:has(.frame.is-missing) { mix-blend-mode: normal; }
```

- [ ] **Step 7: Build the haze**

Append to `projects.css`:

```css
/* Rolling haze. Atmosphere between depth planes, which is what fog physically
   is — not a gradient used as light.

   The ::after is 200% wide and the loop translates it by exactly -50% of its
   own width. For the wrap to be invisible, every pattern period must divide
   that 50% evenly. Two gradients are used: one at a 25% period (2 whole
   periods per loop) and one at 12.5% (4 per loop). The beat between them
   kills the stripe read a single repeating gradient has, and neither seam
   ever lands on screen. Do not change a period to a value that does not
   divide 50% -- 20% would wrap mid-band and the jump is very visible.

   The animation goes on the ::after and not the plate: the plate's transform
   is the parallax, and the two would overwrite each other. Same structural
   reason .hero .plate--fog::after exists. */
#ridge .plate--haze::after {
  content: '';
  position: absolute;
  inset: 34% -50% auto -50%;
  height: 34%;
  background:
    repeating-linear-gradient(
      to right,
      transparent 0%,
      color-mix(in oklab, var(--fg) 6%, transparent) 10%,
      transparent 25%
    ),
    repeating-linear-gradient(
      to right,
      transparent 0%,
      color-mix(in oklab, var(--fg) 4%, transparent) 5%,
      transparent 12.5%
    );
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 35%,
    black 65%,
    transparent 100%
  );
  animation: haze-drift 48s linear infinite;
}

@keyframes haze-drift {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}

/* No scroll link means no parallax; a band sliding sideways forever with
   nothing else moving is worse than a still one. */
@media (prefers-reduced-motion: reduce) {
  #ridge .plate--haze::after { animation: none; }
}
```

Note: `inset` and `height` are declared **statically**, never animated. Only `transform` appears in the keyframe, which is what the animation guard in `tests/base-css.test.ts` requires.

- [ ] **Step 8: Move the panel's structural CSS out of the generated file**

Open `src/styles/layout.generated.css` and look for:

```css
.frame[data-label="Projects L3 — ridge-near"] {
  height: 53%;
  top: 47%;
  background: transparent;
}
```

`background: transparent` is now declared in `projects.css` (Step 6) and must not depend on a generated file that is rewritten on every Save. The `height`/`top` band trim is framing and stays generated — leave it. Delete only the `background: transparent` line from that block. If the whole block becomes empty, delete the block.

- [ ] **Step 9: Run the full gate**

```
npm test && npx tsc -b --noEmit && npm run lint && npm run build
```

Expected: all green. `tests/base-css.test.ts` enumerates `src/styles/*.css` from the directory, so the new `projects.css` rules are swept automatically for hex literals and for banned animated properties.

- [ ] **Step 10: Verify it in a real browser**

Check the port is free first, then start it pinned:

```
devservers list
npm run dev -- --port 5174 --strictPort
npm run filmstrip -- http://localhost:5174/projects.html "#ridge"
```

Open the PNG it writes under `scratchpad/`. Confirm across the 8 frames at 1440×900 and 390×844: the `Projects` title passes **behind** the front plate's placeholder as the stack scrolls, and the haze band is visible. The haze's drift will not show in a filmstrip (it is time-based, not scroll-based) — confirm that separately by watching the page.

- [ ] **Step 11: Commit**

```bash
git add projects.html src/styles/stack.css src/styles/projects.css src/styles/layout.generated.css
git commit -m "feat: give Projects a four-plate ridge and a drifting haze

Declares #ridge as a complete depth scope rather than patching a fourth plate
into the base three, so the title sits at z3 beneath the ridge silhouette at
z4. The haze is CSS, not an image: two repeating gradients whose periods both
divide the -50% translate evenly, so the wrap never lands on screen.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Projects — the two ridge images

**This task spends money and requires the owner in the loop. It cannot be run unattended.**

**Files:**
- Create: `assets/img/ridge-far.webp`, `assets/img/ridge-near.webp`
- Modify: `projects.html:48-50` and `projects.html:57-59` (restore the real `src` paths)
- Delete: `assets/img/images.jpg`, `assets/img/snow-mountain-on-the-horizon-isolated-against-a-transparent.png`
- Modify: `docs/image-slots.md`

**Interfaces:**
- Consumes: the `#ridge` scope and the multiply rule from Task 2.
- Produces: two files at the exact paths the markup already expects. No code change beyond the `src` swap.

- [ ] **Step 1: Read the references off disk**

Open both files and write the observations into the ledger entry before prompting anything:

- `assets/img/images.jpg` (547×365) — the `ridge-far` reference.
- `assets/img/snow-mountain-on-the-horizon-isolated-against-a-transparent.png` (525×350) — the `ridge-near` reference.

**Keep from `images.jpg`:** the layered ridge recession, four or five planes deep, each plane lighter than the one in front; the fog bank cutting horizontally across the middle distance and swallowing the base of the peaks; the dark spruce treeline reading as a serrated edge below the fog.
**Kill:** the Adobe watermark; the 547×365 resolution; the flat stock blue; the pure-white sky, which must come down into the room's `--bg-deep` range so bone type stays readable.

**Keep from the snow-mountain PNG:** the single foreground peak's silhouette, symmetrical, rising from the bottom edge.
**Kill:** everything else. This is a silhouette, not a photograph of a mountain. The reference's own snow highlights are near-white and will vanish under multiply, so the prompt asks for **dark rock with snow in shadow**, not a sunlit white peak.

- [ ] **Step 2: Look at them in the page**

```
npm run filmstrip -- http://localhost:5174/projects.html "#ridge"
```

Write the prompt against how the reference behaves while scrolling — where the title crosses the peak, what the travel exposes at the bottom edge — not against how the file looks standing still.

- [ ] **Step 3: Present the spend and stop**

Present to the owner: two slots, `ridge-far` (1536×1024, Tier 1 opaque, explore then final) and `ridge-near` (1536×1024, Tier 2 white→multiply, explore only). Estimated $0.02 explore + $0.32 final + $0.02–0.06 for the near plate. **Wait for an explicit yes.** Do not generate on a "sounds good" that was about the plan rather than the spend.

- [ ] **Step 4: Generate `ridge-far` at explore tier — one image**

Room: Projects, accent `#7f9bbd` slate, `--bg-deep` `#0e1115`. Cold, overcast, 35mm, film grain, no sun. Prompt for the subject and the light. **Never prompt "brighter" or "darker"** — that overshot by 2.7× once and cost a roll; exposure is set numerically in `grade.py` against a measured target.

- [ ] **Step 5: Judge it composited, not as a file**

Drop it at `assets/img/ridge-far.webp`, point `projects.html` at it, and run the filmstrip again. Show the owner the tiled PNG. If rejected, re-roll at explore price and log the failure — §7 of the ledger exists because the failures are why the final worked first time.

- [ ] **Step 6: Grade and promote to final**

Once the composition is accepted, run the final-tier render, then grade it:

```
python tools/grade.py assets/img/ridge-far.raw.webp assets/img/ridge-far.webp
```

Measure the wordmark-band luminance against the bone type at 0.941, the same way `jungle-far` was measured (it landed at band lum 0.488 after gamma 1.22 / exposure 0.97). Set the numbers, do not eyeball them.

- [ ] **Step 7: Generate and gate `ridge-near`**

Explore tier only — a silhouette gains nothing from final tier, which is what saved $0.32 on `jungle-mid`. Then gate it:

```
python tools/checkplate.py assets/img/ridge-near.webp
```

Required: corner RGB pure white (the white point may need pushing to 255, as `jungle-mid` and `jungle-near` both did), centre-band coverage **≤25%**. The summit must sit inside 37.5%–62.5% of width.

- [ ] **Step 8: Delete the stock references**

```bash
git rm --cached assets/img/images.jpg 2>/dev/null; rm -f assets/img/images.jpg
rm -f "assets/img/snow-mountain-on-the-horizon-isolated-against-a-transparent.png"
```

Both are untracked third-party stock files and one carries a visible watermark. **No commit may leave a watermarked stock asset referenced by a page.** Confirm `projects.html` points at `/assets/img/ridge-far.webp` and `/assets/img/ridge-near.webp`.

- [ ] **Step 9: Log every roll to the ledger**

Add a `## Projects — hero` section to `docs/image-slots.md` in the format the Home sections use: slot, role, tier, status, spend, notes. Log **every** roll including rejections, with its cost and why it was rejected. Update the running total.

- [ ] **Step 10: Run the full gate and commit**

```bash
npm test && npx tsc -b --noEmit && npm run lint && npm run build
git add projects.html assets/img/ridge-far.webp assets/img/ridge-near.webp docs/image-slots.md
git commit -m "feat: land the Projects ridge

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Music — blend the cave front plate

Music's three plates already match the base scope exactly (back z1 −90, copy z2 −260, front z3 −430), so no depth declaration is needed. This task is only the blend and the structural CSS move.

**Files:**
- Modify: `src/styles/music.css`
- Modify: `src/styles/layout.generated.css`
- Test: `tests/base-css.test.ts`, `tests/stack-depth.test.ts`

**Interfaces:**
- Consumes: the base `.plate--back/--copy/--front` depths in `stack.css`, unchanged.
- Produces: `.page-hero .plate--front` on Music composites with multiply, so Task 5's `cave-near` can be a white-ground plate with a pure-white centre band.

- [ ] **Step 1: Add the blend rules**

After the existing `.page-hero` rules in `music.css`:

```css
/* The near cave carries rock at BOTH edges with a pure-white band through the
   centre. Under multiply white is a hole, so the h1 sits in that gap and the
   rock closes over it from above and below as the plate travels. Targets
   .plate, never .frame — .plate sets will-change: transform, which creates a
   stacking context that a blend on a child cannot escape. */
.page-hero .plate--front { mix-blend-mode: multiply; }
.page-hero .plate--front .frame { background: transparent; }
.page-hero .plate--front:has(.frame.is-missing) { mix-blend-mode: normal; }
```

- [ ] **Step 2: Remove the generated duplicate**

In `src/styles/layout.generated.css`, delete `background: transparent;` from the `.frame[data-label="Music L3 — cave-near"]` block. The `height: 25%` / `top: 37.5%` band trim is framing and stays. If the block is left empty, delete it.

- [ ] **Step 3: Run the full gate**

```
npm test && npx tsc -b --noEmit && npm run lint && npm run build
```

- [ ] **Step 4: Verify in the browser**

```
npm run filmstrip -- http://localhost:5174/music.html ".page-hero"
```

Confirm `Recursion` is legible over the current reference at both widths, and that the front plate's placeholder does not black out the stack.

- [ ] **Step 5: Commit**

```bash
git add src/styles/music.css src/styles/layout.generated.css
git commit -m "feat: composite the Music front plate with multiply

Moves background: transparent out of the generated stylesheet, which is
rewritten wholesale on every panel Save, and into music.css where the layer's
correctness can depend on it.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Music — the two cave images

**This task spends money and requires the owner in the loop.**

**Files:**
- Create: `assets/img/cave-far.webp`, `assets/img/cave-near.webp`
- Modify: `music.html:47` (restore `/assets/img/cave-far.webp`)
- Delete: `assets/img/purple-crystals-shining-mystic-cave-underground-river-glowin.webp`
- Modify: `docs/image-slots.md`

**Interfaces:**
- Consumes: the multiply rule from Task 4.
- Produces: two files at the paths the markup already expects.

**The binding ruling for this slot pair:** **all light lives in `cave-far`.** Multiply can only darken — that is the exact property that lets it remove white without a matte. Crystals on the near plate therefore **cannot emit**. `cave-near`'s crystals read as *shape* — faceted silhouettes in the rock — and the light behind them comes from `cave-far`. The owner decided this explicitly over buying a `screen`-blended glint layer. Do not revisit it by adding a third blend mode to the site.

- [ ] **Step 1: Read the reference off disk**

`assets/img/purple-crystals-shining-mystic-cave-underground-river-glowin.webp` (800×449).

**Keep:** the cavern's depth and scale; violet crystal clusters as the dominant light source; the underground river running through the lower frame carrying reflected violet off wet surfaces — the owner's "crystals plus the water."
**Kill:** the Dreamstime watermark; the digital-fantasy-art rendering, which becomes 35mm photography with film grain like every other room; the bright white shaft from above, dropped so the crystals are the light; the overall lavender wash, which falls back to near-black wet rock with violet only where the crystals actually throw it.

The owner's words, verbatim, into the prompt brief: *"darker wet cave with purple little crustatls shining like ligts"* and *"stalagties, stalagmitesa and bouldrs, with some visible glowing crystals, small."*

- [ ] **Step 2: Look at it in the page, then present the spend and stop**

Filmstrip first, then present: `cave-far` (1536×1024, Tier 1, explore + final) and `cave-near` (1536×1024, Tier 2, explore only). Estimated $0.02 + $0.32 + $0.02–0.06. **Wait for an explicit yes.**

- [ ] **Step 3: Generate `cave-far` at explore tier — one image**

Room: Music, accent `#b97fc9` orchid, `--bg-deep` `#0c090f`. Dark. Bone type sits over this at `--step-display`, so the centre band needs headroom.

- [ ] **Step 4: Judge composited, then grade to final**

```
python tools/grade.py assets/img/cave-far.raw.webp assets/img/cave-far.webp
```

Apply the same measured band-luminance discipline `jungle-far` got, set numerically. Never prompt "darker" — the whole point of a dark room is that the exposure is a number, not an adjective.

- [ ] **Step 5: Generate `cave-near` — one image, both edges**

Stalactites hang in from the **top** edge, light and sparse. Stalagmites and boulders mass along the **bottom** edge, heavy — "more bottom." The centre band is left pure white. Crystals in this plate are faceted **silhouettes**, not lights.

- [ ] **Step 6: Gate it**

```
python tools/checkplate.py assets/img/cave-near.webp
```

Corner RGB pure white; centre-band coverage **≤25%**, which for this slot is not a constraint being fought but the literal design — the white band *is* the gap the title sits in.

- [ ] **Step 7: Delete the stock reference**

```bash
rm -f "assets/img/purple-crystals-shining-mystic-cave-underground-river-glowin.webp"
```

Confirm `music.html` points at `/assets/img/cave-far.webp`. This file carries a visible Dreamstime watermark and must not survive into a build.

- [ ] **Step 8: Log, gate, commit**

Add `## Music — hero` to `docs/image-slots.md` with every roll and its cost, then:

```bash
npm test && npx tsc -b --noEmit && npm run lint && npm run build
git add music.html assets/img/cave-far.webp assets/img/cave-near.webp docs/image-slots.md
git commit -m "feat: land the Music cave

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Home — the seventh plate

This is the only task that touches a stack already shipping, so it carries the most regression risk. **Give it a review pass** per CLAUDE.md §3.

**Files:**
- Modify: `src/styles/stack.css` (hero scope, desktop and mobile; `--stack-h`; the multiply and transparent-frame lists; `.hero-intro`/`.hero-progress` z-index)
- Modify: `index.html` (insert the plate between `--near` and `--low`)
- Test: `tests/stack-depth.test.ts`, `tests/plate-coverage.test.ts`, `tests/sitewide.test.ts`

**Interfaces:**
- Consumes: Task 1's contiguous-z rule — inserting at z6 means `--low` **must** be restated at z7 or the group breaks.
- Produces: `.hero .plate--shrub` and the frame `data-label="Hero L6 — undergrowth-low"`, which is also the key the visual editing panel stores framing under.

- [ ] **Step 1: Renumber the hero scope in `stack.css`**

Replace the six `.hero .plate--*` rules with seven:

```css
.hero { --stack-h: 300vh; }
.hero .plate--far   { z-index: 1; --rate: -60; }
.hero .plate--fog   { z-index: 2; --rate: -120; pointer-events: none; }
.hero .plate--mid   { z-index: 3; --rate: -190; }
.hero .plate--name  { z-index: 4; --rate: -250; display: grid; place-content: center; }
.hero .plate--near  { z-index: 5; --rate: -350; }
/* The undergrowth the wordmark passes behind. It sits ABOVE --name and BELOW
   --low so the fog still reads as the nearest thing in frame. --stack-h grew
   260vh -> 300vh to give it runway to climb. */
.hero .plate--shrub { z-index: 6; --rate: -440; }
.hero .plate--low   { z-index: 7; --rate: -520; pointer-events: none; }
```

- [ ] **Step 2: Lift the absolutely-positioned chrome above it**

`.hero-intro` sits bottom-left — exactly where undergrowth lives — so it must climb above the shrub or the plate grows over the owner's lede. In `stack.css`, change **both** `.hero-intro { z-index: 7 }` and `.hero-progress { z-index: 7 }` to `z-index: 8`.

- [ ] **Step 3: Update the mobile rates**

In the `@media (max-width: 744px)` block:

```css
  .hero .plate--near  { --rate: -215; }
  .hero .plate--shrub { --rate: -270; }
  .hero .plate--low   { --rate: -320; }
```

(`--far`, `--fog`, `--mid`, `--name` are unchanged at −36/−70/−110/−150.)

- [ ] **Step 4: Add the shrub to the blend and transparent-frame lists**

```css
.hero .plate--mid,
.hero .plate--near,
.hero .plate--shrub { mix-blend-mode: multiply; }

.hero .plate--mid .frame,
.hero .plate--near .frame,
.hero .plate--shrub .frame { background: transparent; }

.hero .plate--mid:has(.frame.is-missing),
.hero .plate--near:has(.frame.is-missing),
.hero .plate--shrub:has(.frame.is-missing) { mix-blend-mode: normal; }
```

- [ ] **Step 5: Add the plate to `index.html`**

Between the `plate--near` div and the `plate--low` div:

```html
        <div class="plate plate--shrub" aria-hidden="true">
          <figure class="frame" data-label="Hero L6 — undergrowth-low">
            <img src="/assets/img/undergrowth-low.webp" alt="" loading="eager" />
          </figure>
        </div>
```

`data-label` is mandatory — `tests/sitewide.test.ts` fails a page without it. While the file is missing, `imageFrame.ts` marks the frame `.is-missing` and CSS renders a labelled dashed box at the right aspect ratio. **That is the designed state, not a failure.**

- [ ] **Step 6: Give the shrub a reduced-motion rest position**

With no scroll link `--p` stays 0, so the shrub never climbs — it sits wherever the
image puts it, forever. The plate is designed to *rise into* the wordmark, so at rest it
must sit clear of it. Add to the existing `@media (prefers-reduced-motion: reduce)` block
in `stack.css`:

```css
  /* No --p means no climb, so the shrub sits at rest for good. Nudge it down
     by the travel it will never make, so the wordmark is never covered by a
     layer that cannot move off it. */
  .hero .plate--shrub { transform: translate3d(0, 12%, 0); }
```

`transform` is the one property the reduced-motion block may still set — the rule above
it zeroes `.plate` transforms, and this re-states one statically rather than animating it.

- [ ] **Step 7: Run the guards**

```
npx vitest run tests/stack-depth.test.ts tests/plate-coverage.test.ts tests/sitewide.test.ts
```

Expected: PASS. `plate-coverage` should still find a hero rate exceeding the 108px overscan (−520 does), and `.plate > .frame`'s `height: calc(100% - var(--rate) * 1px)` already compensates the new travel with no change.

- [ ] **Step 8: Run the full gate**

```
npm test && npx tsc -b --noEmit && npm run lint && npm run build
```

- [ ] **Step 9: Verify the hero still works end to end**

```
npm run filmstrip -- http://localhost:5174/ "#hero"
```

Check across all 8 frames at both widths: the wordmark still centres, the intro lede at bottom-left is **not** covered by the shrub placeholder, the hero-progress hairline still fills, and no bare strip appears at the bottom of any plate at full scroll. The runway grew 40vh, so confirm the whole stack still feels paced rather than slack.

- [ ] **Step 10: Commit**

```bash
git add index.html src/styles/stack.css
git commit -m "feat: give the Home hero a seventh plate for the undergrowth

The wordmark now passes behind a shrub layer at z6. --low moves to z7 and the
hero chrome to z8 so the intro lede, which sits bottom-left where undergrowth
lives, is never grown over. Runway 260vh -> 300vh for the climb.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Home — the undergrowth image

**This task spends money and requires the owner in the loop.**

**Files:**
- Create: `assets/img/undergrowth-low.webp`
- Modify: `docs/image-slots.md`

**Interfaces:**
- Consumes: `.hero .plate--shrub` and its `data-label` from Task 6.
- Produces: one file at `assets/img/undergrowth-low.webp`. No code change at all — the markup already points at it.

**There is no reference file for this slot.** The owner's words are the brief: *"add some bushes or shrubery to the bototm of the home hero so when yous croll name goes behind teh shruberry."* He chose the dark-undergrowth-band option over tall grass and over large monstera leaves.

- [ ] **Step 1: Read the three images this one has to match**

Open `assets/img/jungle-far.webp`, `jungle-mid.webp` and `jungle-near.webp`. This plate sits directly beneath all three and must read as the same shoot: warm saturated yellow-green tropical jungle, dense and tangled, 35mm with film grain.

- [ ] **Step 2: Present the spend and stop**

One slot, `undergrowth-low`, 1536×1024, Tier 2 white→multiply, explore tier only. Estimated $0.02–0.06. **Wait for an explicit yes.**

- [ ] **Step 3: Generate — one image**

Dark tropical undergrowth — elephant ear, tree fern crowns, low broad leaves — massed across the bottom ~30% of frame as a continuous band, on a pure white ground.

**Demand crisp edges.** Roll 4 of `jungle-near` was rejected by the owner as blurry, and the blur was a prompt error: the words "slightly out of focus." Do not use that phrase or any synonym. The accepted roll measured edge sharpness 5.96 against the rejected roll's 3.64.

- [ ] **Step 4: Gate it**

```
python tools/checkplate.py assets/img/undergrowth-low.webp
```

Corner RGB pure white — push the white point to 255 if needed, as `jungle-mid` and `jungle-near` both required. Coverage in the default wordmark band should measure **near zero**, because at rest the shrub is entirely below the name.

- [ ] **Step 5: Judge what it does at full travel, which the number cannot tell you**

The 25% cap is not the real test for this slot. The real test is what the plate does after climbing 440px:

```
npm run filmstrip -- http://localhost:5174/ "#hero"
```

Accept only if, across the 8 frames, the wordmark ends up **partly occluded and still readable** at both 1440×900 and 390×844. Fully buried is a re-roll. Never touching the name is a re-roll — the occlusion is the whole feature.

- [ ] **Step 6: Log and commit**

Add the slot to the `## Home — hero` table in `docs/image-slots.md` with every roll and its cost, then:

```bash
npm test && npx tsc -b --noEmit && npm run lint && npm run build
git add assets/img/undergrowth-low.webp docs/image-slots.md
git commit -m "feat: land the Home undergrowth

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Workshop — `--zoom` and the doorway dolly

The one genuinely new piece of motion on the site. **Give it a review pass.**

**Files:**
- Modify: `src/styles/stack.css` (the shared `.plate` transform, the `#arrive` scope, mobile rates)
- Modify: `src/styles/workshop.css`
- Modify: `workshop.html:45-62`
- Test: `tests/stack-depth.test.ts`, `tests/base-css.test.ts`, `tests/sitewide.test.ts`

**Interfaces:**
- Consumes: Task 1's non-decreasing `--zoom` rule, which skips `--copy` and permits `--face`/`--door` to tie.
- Produces: `--zoom` as a sitewide primitive defaulting to `0`; the `.doorway` clip box class; the frames `Workshop L1 — shop-interior`, `Workshop L2 — cottage-face` and `Workshop L3 — cottage-door`.

**Revision to the spec's starting numbers.** The spec §4.4 proposed `--zoom: 1.6` on the facade with a 2.1× cap, and flagged those as starting values needing browser tuning. They do not reach far enough: a doorway at 22% of frame width scaled 2.6× lands at 57%, short of the ~70% the handoff needs. This plan uses **2.2** on the facade plane (scale 1→3.2, doorway 22%→70%) and **3.0** on the needles. The spec has been updated to match. These are still starting values — tune them against the real facade in Step 10.

- [ ] **Step 1: Add `--zoom` to the shared plate transform**

In `stack.css`, replace the `.plate` rule:

```css
.plate {
  position: absolute;
  inset: -12% -3%;
  will-change: transform;
  /* --zoom defaults to 0, so scale() resolves to 1 and every stack already
     shipping is untouched. Near layers scaling faster than far ones is what
     makes a dolly-in read as forward motion rather than a zoom — the same
     depth rule --rate carries, on a second axis. */
  transform:
    translate3d(0, calc(var(--p, 0) * var(--rate, 0) * 1px), 0)
    scale(calc(1 + var(--p, 0) * var(--zoom, 0)));
}
```

- [ ] **Step 2: Run the whole suite before going further**

```
npm test
```

Expected: **all green, unchanged.** This step exists to prove `--zoom: 0` is genuinely inert before five new plates depend on it. If anything moved, stop and fix it here — not after Workshop's markup is rewritten.

- [ ] **Step 3: Declare the `#arrive` scope**

In `stack.css`, after the `#ridge` block:

```css
/* ── Workshop's approach: five layers and a dolly through the door ──
   --interior, --face and --door are all the FACADE PLANE and share a --zoom:
   the doorway and the door belong to the wall, and giving the door its own
   depth would drift it off the opening as the dolly runs. The interior image
   inside the doorway carries its own, slower scale (workshop.css) — that
   difference is what reads as a room still some distance away. ── */
#arrive { --stack-h: 320vh; }
#arrive .plate--interior { z-index: 1; --rate: -60;  --zoom: 2.2; }
#arrive .plate--face     { z-index: 2; --rate: -120; --zoom: 2.2; }
#arrive .plate--door     { z-index: 3; --rate: -150; --zoom: 2.2; }
#arrive .plate--copy     { z-index: 4; --rate: -250; }
#arrive .plate--front    { z-index: 5; --rate: -430; --zoom: 3.0; }
```

Move `#arrive { --stack-h: 320vh; }` here and delete the `.page-hero { --stack-h: 180vh; }` override's effect on Workshop by leaving that rule alone — `#arrive` is an id and wins on specificity.

- [ ] **Step 4: Add the mobile rates**

In the `@media (max-width: 744px)` block:

```css
  #arrive .plate--interior { --rate: -36; }
  #arrive .plate--face     { --rate: -72; }
  #arrive .plate--door     { --rate: -90; }
  #arrive .plate--copy     { --rate: -150; }
  #arrive .plate--front    { --rate: -250; }
```

- [ ] **Step 5: Rewrite the `#arrive` markup**

Replace `workshop.html` lines 45–62 with:

```html
    <section class="stack page-hero" id="arrive">
      <div class="stack-view">

        <div class="plate plate--interior" aria-hidden="true">
          <div class="doorway">
            <figure class="frame" data-label="Workshop L1 — shop-interior">
              <img src="/assets/img/shop-interior.webp" alt="" loading="eager" />
            </figure>
          </div>
        </div>

        <div class="plate plate--face" aria-hidden="true">
          <figure class="frame" data-label="Workshop L2 — cottage-face">
            <img src="/assets/img/cottage-face.webp" alt="" loading="eager" />
          </figure>
        </div>

        <div class="plate plate--door" aria-hidden="true">
          <figure class="frame" data-label="Workshop L3 — cottage-door">
            <img src="/assets/img/cottage-door.webp" alt="" loading="eager" />
          </figure>
        </div>

        <div class="plate plate--copy">
          <h1 class="display" data-edit="arrive.title">Workshop</h1>
          <p class="lede" data-edit="arrive.lede">Finding things, fixing things, and letting them go again.</p>
        </div>

        <div class="plate plate--front" aria-hidden="true">
          <figure class="frame" data-label="Workshop L4 — needles-near">
            <img src="/assets/img/needles-near.webp" alt="" loading="eager" />
          </figure>
        </div>

      </div>
    </section>
```

Note `Workshop L1 — cottage-far` is **gone**, renamed to `Workshop L2 — cottage-face`. `data-label` is the key the panel stores framing under, so whatever framing the owner set on `cottage-far` is dropped. Check `layout.generated.css` for an orphaned `.frame[data-label="Workshop L1 — cottage-far"]` block and delete it; re-frame the slot from the panel afterwards.

- [ ] **Step 6: Build the doorway and the door in `workshop.css`**

Replace the existing `#arrive .plate--front { mix-blend-mode: multiply; }` rule with:

```css
/* Every plate above the interior ships opaque on pure white and composites
   arithmetically. On .plate, never .frame — .plate sets will-change:
   transform, which creates a stacking context a child blend cannot escape. */
#arrive .plate--face,
#arrive .plate--door,
#arrive .plate--front { mix-blend-mode: multiply; }

#arrive .plate--face .frame,
#arrive .plate--door .frame,
#arrive .plate--front .frame { background: transparent; }

#arrive .plate--face:has(.frame.is-missing),
#arrive .plate--door:has(.frame.is-missing),
#arrive .plate--front:has(.frame.is-missing) { mix-blend-mode: normal; }

/* The doorway is a clip box, not an image. It lives inside --interior, so it
   inherits the facade's scale and stays registered to the opening in
   cottage-face for the whole dolly. These four numbers must match where the
   doorway actually lands in the generated facade — they are starting values,
   tuned against filmstrip output once the real image exists. */
#arrive .doorway {
  position: absolute;
  left: 39%;
  top: 46%;
  width: 22%;
  height: 34%;
  overflow: hidden;
}
#arrive .doorway > .frame { width: 100%; height: 100%; }

/* The room inside grows more slowly than the doorway around it. That
   difference is the entire depth cue: a doorway scaling 3.2x with a room
   scaling 1.4x inside it reads as walking toward a far wall. */
#arrive .doorway img {
  transform: scale(calc(1 + var(--p, 0) * 0.4));
}

/* The door swings on its hinge. rotateY is a transform, so this costs nothing
   against the animation guard, and a slab translating sideways reads as a
   barn door. The frame is sized to the door opening rather than the plate, so
   the pivot is the real hinge edge and not the viewport edge. clamp() stops
   the swing at 95deg instead of over-rotating past the opacity handoff. */
#arrive .plate--door > .frame {
  position: absolute;
  left: 39%;
  top: 46%;
  width: 22%;
  height: 34%;
  transform-origin: left center;
  transform: perspective(1200px)
             rotateY(clamp(-95deg, calc(var(--p, 0) * -136deg), 0deg));
}

/* Two phases. The dolly cannot finish the job on scale alone — a doorway at
   22% of frame would need ~4.5x to fill a 1440px viewport and a 1536px source
   has nowhere near that much detail. So from --p 0.7 the facade, the door and
   the needles fade out while the interior keeps growing. By then the doorway
   already dominates the frame, so the fade reads as the doorframe passing the
   camera rather than as a dissolve.

   opacity clamps above 1, so this is 1 for all of --p 0..0.7 and falls
   linearly to 0 at --p 1. Opacity is on the allowed-to-animate list. */
#arrive .plate--face,
#arrive .plate--door,
#arrive .plate--front {
  opacity: calc(1 + (0.7 - var(--p, 0)) / 0.3);
}

/* The title leaves before the walls do. */
#arrive .plate--copy {
  opacity: calc(1 + (0.45 - var(--p, 0)) / 0.2);
}

@media (prefers-reduced-motion: reduce) {
  /* No scroll link means no --p, so no dolly and no swing. A permanently shut
     door in front of a room the reader can never reach is worse than no door,
     so it is removed entirely and #inside becomes the path to the shop. This
     is why #inside must survive as a real section. */
  #arrive .plate--door { display: none; }
  #arrive .plate--face,
  #arrive .plate--front { opacity: 1; }
  #arrive .plate--copy { opacity: 1; }
}
```

- [ ] **Step 7: Point `#inside` at the same interior file**

`#inside` reuses `shop-interior` at a closer crop rather than buying a separate room — if the dolly lands the reader inside a room and the next stack shows a *different* generated room, the walk-in is undone. In `workshop.html`, change the `#inside` back plate:

```html
        <div class="plate plate--back">
          <figure class="frame" data-label="Workshop L5 — shop-interior-close">
            <img src="/assets/img/shop-interior.webp" alt="" loading="lazy" />
          </figure>
        </div>
```

and delete the `plate--front` div whose frame is `Workshop L6 — bench-near` — that slot is cancelled. The closer crop is set from the panel as `object-position` / `--img-zoom` against the new `data-label`, not hand-written here.

- [ ] **Step 8: Run the guards**

```
npx vitest run tests/stack-depth.test.ts tests/sitewide.test.ts tests/base-css.test.ts
```

Expected: PASS. If the `--zoom` test fails naming `#arrive .plate--front vs --door`, check that `--copy` is being skipped — it carries no `--zoom` and must not break the chain.

- [ ] **Step 9: Run the full gate**

```
npm test && npx tsc -b --noEmit && npm run lint && npm run build
```

- [ ] **Step 10: Tune the dolly in a real browser against real events**

```
npm run filmstrip -- http://localhost:5174/workshop.html "#arrive"
```

`filmstrip.mjs` drives the page with real `page.mouse.wheel()` — Lenis's virtual scroll ignores programmatic `scrollTo`, and that gap is what let an unscrollable overlay ship once. Across the 8 frames, check and adjust:

- The doorway clip box (`left`/`top`/`width`/`height`, used **twice** — `.doorway` and `.plate--door > .frame` — keep them identical) lands on the actual opening in `cottage-face`.
- The door's pivot is at the hinge edge, not floating.
- At `--p ≈ 0.7` the doorway fills roughly 70% of frame width. If short, raise `--zoom` on all three facade-plane plates together, never one alone.
- The fade completes before the facade's edges become visibly soft from upscaling.
- At 390×844 the doorway is still inside the 37.5%–62.5% safe band.

- [ ] **Step 11: Commit**

```bash
git add workshop.html src/styles/stack.css src/styles/workshop.css src/styles/layout.generated.css
git commit -m "feat: walk through the cottage door into the workshop

Adds --zoom as a sitewide plate primitive defaulting to 0, so every existing
stack resolves to scale(1) untouched. Workshop's facade plane -- interior
doorway, facade and door -- shares one zoom so the door never drifts off its
opening; the room inside scales slower, which is the depth cue. The door
swings on rotateY, and a two-phase opacity handoff from --p 0.7 carries the
last stretch that scale cannot, because a 22% doorway would need 4.5x to fill
the frame and the source has no such detail.

#inside now reuses shop-interior at a closer crop; bench-far and bench-near
are cancelled.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Workshop — the four images

**This task spends money and requires the owner in the loop. It is the largest spend in the plan.**

**Files:**
- Create: `assets/img/cottage-face.webp`, `assets/img/cottage-door.webp`, `assets/img/shop-interior.webp`, `assets/img/needles-near.webp`
- Create: `tools/punchdoor.py`
- Delete: `assets/img/images-2.jpg`
- Modify: `docs/image-slots.md`

**Interfaces:**
- Consumes: the `#arrive` scope, `.doorway` clip box and blend rules from Task 8.
- Produces: four files at the paths the markup expects, plus `punchdoor.py` — a deterministic post step, in the same family as `grade.py`.

**Generation order is fixed:** `cottage-face` → `cottage-door` (must match the facade's opening and wood tone) → `shop-interior` → `needles-near`.

- [ ] **Step 1: Read the reference and present the spend**

`assets/img/images-2.jpg` (420×476) is the `cottage-face` reference.

**Keep:** the log cabin with its steep shingled roof, the chimney with smoke, the dark spruce wall pressing in from both sides, the damp overcast light.
**Kill:** the three-quarter camera angle — the facade must be **square-on**, because the doorway is punched out as a clean rectangle in post and perspective makes that unreliable; the cabin's 45% frame width, which rises to ~70% so there is detail left at 3.2×; the green saturation, which comes down to the room's cold desaturated range.

Present four slots. `shop-interior` is Tier 1 with a final; the other three are explore only. Estimated $0.06–0.12 explore + $0.32 final. **Wait for an explicit yes.**

- [ ] **Step 2: Generate `cottage-face` at the largest available long edge — one image**

Room: Workshop, accent `#c0a06a` ochre. **Cold and overcast** — the deliberate biome contrast with Home's warm tropical jungle. Northern spruce, vertical, tall straight trunks. The one warm note in the frame is the light spilling from the doorway. Add no other warm source, and keep any wood dark and desaturated so it never approaches clay `#cf6b3e`, which is reserved for clickable things.

Largest available size, because this image gets scaled 3.2× and a 1536px source leaves only ~480px of real detail at that magnification.

- [ ] **Step 3: Gate it — and note this slot's gate is different**

`checkplate.py`'s 25% centre-band cap is a **wordmark legibility** gate. The cottage is the centre of the frame and must fail it by design. Run it anyway for the corner reading, then apply this slot's real gate by hand:

- corner RGB pure white;
- doorway present, rectangular, square-on;
- doorway centre inside 37.5%–62.5% of width.

- [ ] **Step 4: Write `tools/punchdoor.py`**

Under multiply, white is a hole. The doorway must be **pure white** so the interior plate shows through it. AI will not reliably render that on request, so it is done deterministically after acceptance:

```python
"""Fill a facade's doorway with pure white so multiply turns it into a hole.

Deterministic compositing, in the same family as grade.py -- not a rescue of a
bad render. The facade must be shot square-on for this to be honest: a
three-quarter doorway is not a rectangle and filling one would bend the wall.

Usage:
    python tools/punchdoor.py src.webp dst.webp X0 Y0 X1 Y1

X0..Y1 are fractions of width/height, matching the .doorway clip box in
workshop.css. Keep the two in sync -- if the CSS box moves, re-punch.
"""
import sys
from PIL import Image, ImageDraw


def punch(src, dst, box):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(im)
    draw.rectangle([x0 * w, y0 * h, x1 * w, y1 * h], fill=(255, 255, 255))
    im.save(dst, quality=92)
    print(f'{dst}  punched {x0:.3f},{y0:.3f} -> {x1:.3f},{y1:.3f} at {w}x{h}')


if __name__ == '__main__':
    punch(sys.argv[1], sys.argv[2], [float(v) for v in sys.argv[3:7]])
```

Run it with the same fractions as the CSS clip box (`left: 39%`, `top: 46%`, `width: 22%`, `height: 34%` → `0.39 0.46 0.61 0.80`):

```
python tools/punchdoor.py assets/img/cottage-face.raw.webp assets/img/cottage-face.webp 0.39 0.46 0.61 0.80
```

- [ ] **Step 5: Generate `cottage-door` — one image**

A single plank door slab, straight on, dark weathered wood with visible grain and simple iron hardware, alone on a pure white ground. It must match `cottage-face`'s opening in proportion and its wood in tone — which is why it is generated second, with the facade on screen.

Gate with `checkplate.py` for corner RGB pure white.

- [ ] **Step 6: Generate `shop-interior` at explore tier — one image**

The owner's description, verbatim, into the prompt:

> "a man workbench table in the center with a peg board above with some hanging toos, not too many. Scissors, hammer, drill, etc. On the desk one side some sanders and wood working items, spray paints and paints, left side in general has wood working stuff with scraps of wood some wood dust some test painted surfaces, shop should have windows on lef tand right. Right side is more thrifting theme, have a small clothes rack with 6-8 shirts cool jerseys, graphic tees, polo shirts, mostly soccer jsrseys. That side also has tiny sowing things, some glue, some bubble mailer packages, some clear tape and other thrifitng thigns nt too clutered."

**The room is split the way the page is split** — refinishing on the left, reselling on the right, bench and pegboard holding the centre. That maps onto the page's existing `#renew` and `#resell` acts, which is why the room explains the page without a caption. Left reads as sawdust and raw wood; right reads as fabric and packaging; neither side is cluttered.

**Before writing this prompt, open the nine photographs in `assets/img/workshop/`** and match their wood tones and lamp colour. A visible switch from AI room to camera photograph a screen later is the failure mode for this slot. Never generate, replace or grade those nine — they are the owner's own work.

Composition: the bench sits inside the mobile safe band, and the frame must survive being scaled 1.4× inside the doorway.

- [ ] **Step 7: Judge it through the doorway, then promote to final**

Judge it composited — the only view that matters is the one framed by the doorway mid-dolly, not the loose file:

```
npm run filmstrip -- http://localhost:5174/workshop.html "#arrive"
```

Then final tier, then `python tools/grade.py` with numeric targets.

- [ ] **Step 8: Generate `needles-near` — one image**

Dark spruce boughs entering from the top corners on a pure white ground. Northern spruce, not tropical. Crisp edges — do not use "out of focus" or any synonym. Gate with `checkplate.py`: corner RGB pure white, centre-band coverage ≤25%.

- [ ] **Step 9: Re-tune the doorway against the real facade**

The clip box numbers in `workshop.css` and the fractions passed to `punchdoor.py` were placeholders. Now that `cottage-face` exists, set them to where the doorway actually is, in **both** places (`.doorway` and `#arrive .plate--door > .frame`), re-run `punchdoor.py`, and re-run the filmstrip.

- [ ] **Step 10: Delete the stock reference**

```bash
rm -f assets/img/images-2.jpg
```

- [ ] **Step 11: Log, gate, commit**

Add `## Workshop — hero` to `docs/image-slots.md` with every roll and its cost, and update the running total.

```bash
npm test && npx tsc -b --noEmit && npm run lint && npm run build
git add workshop.html src/styles/workshop.css tools/punchdoor.py assets/img/cottage-face.webp assets/img/cottage-door.webp assets/img/shop-interior.webp assets/img/needles-near.webp docs/image-slots.md
git commit -m "feat: land the Workshop cottage and shop

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Close out the queue

**Files:**
- Modify: `docs/image-rooms-queue.md`
- Modify: `CLAUDE.md`
- Verify: `assets/img/`

- [ ] **Step 1: Prove no stock reference survives**

```bash
ls assets/img/
git grep -n "images\.jpg\|images-2\.jpg\|purple-crystals\|snow-mountain" -- '*.html' '*.css' '*.ts'
```

Expected: the `ls` shows only project-named `.webp` files plus `assets/img/workshop/`, and the `git grep` returns **nothing**. Any hit is a watermarked third-party asset still wired into a page — fix it before committing.

- [ ] **Step 2: Close sittings 3–6 in the queue**

In `docs/image-rooms-queue.md`, mark sittings 3, 4 and 5 done, and **delete sitting 6 entirely** — `bench-far` and `bench-near` are cancelled because `#inside` reuses `shop-interior`. Update sitting 5's slot list to `cottage-face`, `cottage-door`, `shop-interior`, `needles-near`. Add a line recording that Home gained `undergrowth-low`. Sittings 2 and 7 stay untouched and unplanned.

- [ ] **Step 3: Record the new architecture in CLAUDE.md**

The "Scroll: one rAF loop, one custom property" section documents `--p` and `--rate`. Add `--zoom` beside them: defaults to `0`, composes into the shared `.plate` transform, ordered non-decreasing by depth with `--copy` exempt and coplanar plates permitted to tie. Also note that depth declarations for **every** stack live in `stack.css` so one guard can read them.

- [ ] **Step 4: Run the full gate and commit**

```bash
npm test && npx tsc -b --noEmit && npm run lint && npm run build
git add docs/image-rooms-queue.md CLAUDE.md
git commit -m "docs: close out the hero rooms queue

Sittings 3-5 done, sitting 6 deleted -- #inside reuses shop-interior, so
bench-far and bench-near were never bought. Records --zoom alongside --p and
--rate as a scroll primitive.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```
