# Overgrowth 4 — Geometry, Colour, the Cottage, and the Image Set

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the layout bug that makes every full-bleed image slot misalign, give each room a visible share of its own colour, turn the Workshop hero into a cottage in a northern spruce forest, and generate the site's image set — in that order, because each step's correctness depends on the one before it.

**Architecture:** No new pages and no new structure. This plan changes one CSS rule with sitewide reach, spends existing design tokens that are already defined but unused, restructures one page's hero into two stacks, and fills sixteen-ish image slots that already render placeholders.

**Tech Stack:** Vite 8 multi-page build, TypeScript 6, React 19 (Coverflow island), Vitest + jsdom, Playwright for browser verification, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-11-portfolio-overgrowth-rebuild-design.md`
**Owner brief (authoritative where it disagrees with the spec):** `docs/overgrowth-plan4-handoff.md`
**Previous plan's ledger:** `.superpowers/sdd/2026-09-11-overgrowth-3-music-and-workshop/progress.md`

**Plan 4 of 4.** Requires Plans 1–3 complete. Starting state: branch
`portfolio-overgrowth-rebuild` at `02b17dc`, 256 tests passing across 20 files, zero skips,
`tsc` / `oxlint` / `npm run build` all clean, all five pages present in `dist/`.

---

## Global Constraints

All of Plan 1's Global Constraints apply unchanged. Restated because they are test-enforced
and each has cost a previous plan at least one round:

- **Colour literals live ONLY in `src/styles/tokens.css`.** Every other stylesheet uses
  `var()` or `color-mix()`. Swept by `tests/base-css.test.ts` and `tests/islands-css.test.ts`
  over every file in `src/styles/`, enumerated from the directory — **a new stylesheet is
  swept the moment it exists.**
- **No pure black (`#000`) or pure white (`#fff`)** in any spelling, in any stylesheet.
- **Only `transform` and `opacity` animate.** Never `top`/`left`/`right`/`bottom`/`width`/
  `height`/`background-position` in a `transition`, `animation` or `@keyframes`. Static
  positioning with those properties is fine.
- **Any rule that can render at ≥32px carries negative `letter-spacing`**; all-caps carries
  ≥0.06em positive. `.work-row__name`-style elements take their type from the `.title-h2`
  utility in `base.css` and declare no `font-family`/`font-size` of their own — keep it that way.
- **Every `var(--x)` referenced must be defined** somewhere in `src/styles/`.
- **Clay (`var(--accent)`) appears ONLY on clickable things.** This rule is not relaxed by
  this plan. See Task 2 for what IS relaxed.
- **No banned copy:** `Sector_`, `NODE_`, `LOG_`, `UPLINK_`, `SIGNAL_`, `STATUS: ONLINE`,
  `BUILD_STATIC`. Enforced by `src/lib/guards.ts` and swept sitewide by `tests/sitewide.test.ts`.
- **Three-layer stacks only.** The six-layer hero is Home's signature and is never repeated
  (spec §7). Task 3 explicitly honours this.
- **Copy is the owner's, not ours.** Write structurally correct, factually honest copy and
  stop. Do not polish prose, and **do not write tests that assert exact sentences** — assert
  structure instead. See `docs/overgrowth-plan4-handoff.md` §1.1.
- **The photography integrity line is absolute.** `assets/img/workshop/` holds nine
  photographs the owner took of two real pieces of furniture. Never generate, replace,
  re-export, or colour-grade them, and never grade them toward the site palette.
- **Nothing on this site describes acquiring music.** If a task draws on the dj-tool design
  doc, its Discover/download module is off-limits as source material.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/styles/stack.css` | Task 1 — the full-bleed frame fill rule |
| `index.html`, `music.html`, `workshop.html`, `projects.html`, `projects/cache-it.html` | Task 1 — strip the inline sizing from plate figures |
| `src/styles/chrome.css` | Task 2 — `.spec dt` takes the room colour |
| `src/styles/base.css` | Task 2 — the `.hl` inline-highlight utility |
| `workshop.html`, `src/styles/workshop.css` | Task 3 — two stacks, exterior then interior |
| `assets/img/*.webp` | Task 5 — the generated set |
| `tests/frames.test.ts` | Task 1 — new, guards the markup contract |
| `tests/workshop-page.test.ts` | Task 3 — updated for the new structure |
| `docs/superpowers/specs/2026-09-11-portfolio-overgrowth-rebuild-design.md` | Tasks 2 and 3 — two amendments |

---

### Task 1: Fix the full-bleed frame geometry

**This task blocks Tasks 4 and 5. Do it first and do not skip its browser verification.**

**Files:**
- Modify: `src/styles/stack.css`
- Modify: `index.html`, `music.html`, `workshop.html`, `projects/cache-it.html` (and `projects.html` if it has plate figures)
- Create: `tests/frames.test.ts`

**Interfaces:**
- Consumes: `.plate` / `.frame` from `stack.css` and `base.css`.
- Produces: correct geometry that every image dimension in Task 5 depends on.

#### The bug, already diagnosed — do not re-derive it

Full-bleed hero figures are written as:

```html
<figure class="frame" style="--ar: 3 / 2; height: 100%;" data-label="…">
```

`.frame` (`base.css:125`) carries `aspect-ratio: var(--ar, 3/2)`. With an inline `height: 100%`
**and** an aspect ratio, the browser derives **width = height × ratio** — so the frame's width
comes from the plate's *height*, never from the plate's *width*. `margin: 0` from the reset
means it is **anchored left**, not centred. `.plate` is `inset: -12% -3%`, so its own aspect
ratio changes with every viewport while the frame's does not. They match only by coincidence.

This is what the owner reported as *"I see the dashed line where the images will go, it's
still not centered"* and, earlier, *"not filling up the whole screen on my monitor nor my laptop."*

#### Measured, before and after — I verified both in Chromium

| Page / stack | Viewport | Plate W | Frame W (before) | Frame W (after fix) |
|---|---|---|---|---|
| `/` `#hero` | 1344×650 | 1409 | 1208 (**−200**) | 1409 (**0**) |
| `/` `#thesis` (`--ar: 4/5`) | 1344×650 | 1409 | 644 (**−764**) | 1409 (**0**) |
| `/` `#hero` | 390×844 | 398 | mismatched | 398 (**0**) |
| `/music.html` hero | 1440×900 | 1511 | 1674 (**+164 overflow**) | — |
| `/music.html` hero | 1920×1080 | 2019 | 2009 (**−11**) | — |

After the fix every `.plate > .frame` matched its plate exactly on both axes, at desktop and
phone widths. `.ba__shot` frames on Workshop were **unaffected** and still compute `4 / 5`
(measured 164×205 = 0.800) — the selector is scoped to plate children only.

- [ ] **Step 1: Write the failing test**

Create `tests/frames.test.ts`. It guards the markup contract, since jsdom has no layout:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PAGES = ['index.html', 'projects.html', 'music.html', 'workshop.html', 'projects/cache-it.html'];
const stackCss = readFileSync('src/styles/stack.css', 'utf8');

describe('full-bleed plate frames', () => {
  it('stack.css makes a frame inside a plate fill that plate', () => {
    // The plate defines the box; object-fit: cover on the img does the fitting.
    expect(stackCss).toMatch(/\.plate\s*>\s*\.frame\s*\{[^}]*aspect-ratio:\s*auto/);
    expect(stackCss).toMatch(/\.plate\s*>\s*\.frame\s*\{[^}]*width:\s*100%/);
    expect(stackCss).toMatch(/\.plate\s*>\s*\.frame\s*\{[^}]*height:\s*100%/);
  });

  describe.each(PAGES)('%s', (page) => {
    const html = readFileSync(page, 'utf8');

    it('gives no plate figure an inline height that fights the plate', () => {
      // A frame that IS the plate background must not size itself. Inline
      // height:100% plus aspect-ratio is what anchored these left and made
      // them miss the plate by up to 764px.
      const plateFigures = html.match(/<div class="plate[^"]*">\s*<figure class="frame[^>]*>/g) ?? [];
      plateFigures.forEach((f) => expect(f).not.toMatch(/height:\s*100%/));
    });

    it('still labels every frame', () => {
      const frames = html.match(/<figure class="frame[^"]*"[^>]*>/g) ?? [];
      frames.forEach((f) => expect(f).toContain('data-label='));
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

`npx vitest run tests/frames.test.ts` — expect failures on the `stack.css` rule and on every
page carrying inline `height: 100%` in a plate figure.

- [ ] **Step 3: Add the rule to `src/styles/stack.css`**

Beside the existing `.plate img` rule:

```css
/* A frame used as a full-bleed plate background fills the plate. --ar sizes
   inline content frames; a background has no shape of its own, because the
   plate already defines the box and object-fit: cover does the fitting.
   Without this the frame derives width from the plate's HEIGHT via
   aspect-ratio and anchors left — at 1344x650 the thesis stack left 764px of
   bare plate with the image shoved against the left edge. */
.plate > .frame { width: 100%; height: 100%; aspect-ratio: auto; }
```

- [ ] **Step 4: Strip the inline sizing from every plate figure**

In all five pages, change plate figures from

```html
<figure class="frame" style="--ar: 3 / 2; height: 100%;" data-label="…">
```

to

```html
<figure class="frame" data-label="…">
```

**Only inside `.plate`.** Leave every other `.frame` alone — `.ba__shot` on Workshop, the
`.cs-hero` frame on the case study, and any inline content frame keep their `--ar` and their
aspect-ratio behaviour. Those are content, not backgrounds.

- [ ] **Step 5: Verify in a browser with real measurements**

Start the dev server on a pinned port: `npm run dev -- --port 5199 --strictPort`.
**Assert each page's `<title>` before trusting any measurement** — port 5173 on this machine
serves a different project's app, and three `200`s from it were nearly accepted as evidence
about this site during an earlier plan.

At **1920×1080, 1440×900 and 390×844**, on all five pages, for every `.plate > .frame`:

```js
const p = f.parentElement, pr = p.getBoundingClientRect(), fr = f.getBoundingClientRect();
// both must be 0
(fr.x + fr.width) - (pr.x + pr.width);
(fr.y + fr.height) - (pr.y + pr.height);
```

Every value must be `0`. Also confirm `.ba__shot` frames on Workshop still compute `4 / 5`.
Put the numbers in your report; "looks fine" is not a result.

- [ ] **Step 6: Record the mobile crop reality — Task 5 depends on this number**

At 390×844 the plate measures ~398 × ~1047, an aspect ratio of **0.38:1**. A 3:2 (1.5:1)
source image cropped to that by `object-fit: cover` keeps only **≈25% of its width** — the
centre quarter. Compute and confirm this yourself, and state it in your report, because it
governs how every image in Task 5 must be composed.

- [ ] **Step 7: Run, verify, commit**

```bash
npm test && npx tsc -b --noEmit && npm run lint && npm run build
git add src/styles/stack.css index.html projects.html music.html workshop.html projects/cache-it.html tests/frames.test.ts
git commit -m "fix: make full-bleed plate frames fill their plate"
```

---

### Task 2: Spend the room colour, starting with Music

**Files:**
- Modify: `src/styles/chrome.css`, `src/styles/base.css`, `music.html`
- Modify: `docs/superpowers/specs/2026-09-11-portfolio-overgrowth-rebuild-design.md` (§15 amendment)

**Interfaces:**
- Consumes: `--accent-2`, already defined per room in `tokens.css` (home sage `#8aa572`,
  projects slate `#7f9bbd`, music orchid `#b97fc9`, workshop ochre `#c0a06a`).
- Produces: nothing other tasks depend on.

#### Why

The owner, on the Music page:

> "The DJ music just doesn't have enough color. You pick the color for each page, but all the
> text is all white, and there's only about a word or a single box of color. And I wish that
> there was just a little tiny bit more color in some of the words."

He is right — `--accent-2` is defined for every room and almost nothing uses it.

**He asked for "a little tiny bit more", not a repaint.** Restraint is the requirement here.

- [ ] **Step 1: Amend spec §15 — the current rule blocks the fix**

Spec §15 reads:

> Clay appears only on clickable things. ≤2 visible uses of each color per screen.

Change the second sentence to scope the count to clay only. Suggested wording:

> Clay appears only on clickable things, and stays rare — ≤2 visible uses per screen. The
> room's `--accent-2` is an identity colour, not a signal, and is not counted; it should
> appear a few times per screen rather than once.

**Rationale to record:** clay is load-bearing — it means "this is clickable" and dilution
breaks the signal. `--accent-2` carries no behavioural meaning, so rationing it only made the
rooms colourless. Plan 3 measured clay at 10 uses on Projects and 6 on Music with **zero on
inert elements**, so the load-bearing half of the rule is intact and stays untouched.

- [ ] **Step 2: Give `.spec` labels the room colour — one line, four rooms**

In `src/styles/chrome.css:52`, change `.spec dt`'s `color: var(--muted)` to
`color: var(--accent-2)`.

`.spec` is shared by all four pages and `--accent-2` is per-room, so this single declaration
gives Home sage labels, Projects slate, Music orchid and Workshop ochre — each room correct
automatically, with no per-page rule.

Check the contrast of each room's `--accent-2` against its `--bg` at `--step-meta` (12px,
uppercase, 0.1em tracking). Small text needs 4.5:1. **If any room fails, report the numbers
and stop** rather than shipping unreadable labels — the fix would be a token change, which is
a bigger decision than this step.

- [ ] **Step 3: Add an inline highlight utility to `src/styles/base.css`**

```css
/* Inline emphasis in the room's own colour. Not a link — clay is the only
   colour that means "clickable". Use sparingly: a phrase, not a sentence. */
.hl { color: var(--accent-2); }
```

- [ ] **Step 4: Use it twice on `music.html`, and no more**

The page's thesis is that a room tells you in eight bars, and the phrase already appears in
both the hero lede and the about copy:

- hero lede: `…and you know inside <span class="hl">eight bars</span>.`
- about copy: `…you find out in <span class="hl">eight bars</span>.`

Wrapping the repeated phrase makes the repetition deliberate rather than accidental. **Do not
add a third.** With the `.spec` labels from Step 2, Music now shows orchid in five small
places instead of one, which is the "little tiny bit more" that was asked for.

- [ ] **Step 5: Look at it before deciding whether Workshop and Projects need more**

Browser-check `/music.html` at 1440×900. If it still reads colourless, the next candidate is
the `#mixes` meta line above the coverflow — but **judge on screen first and report what you
saw.** Do not pre-emptively apply `.hl` to the other rooms in this task; Step 2 already gives
them their labels, and the owner asked about Music specifically.

- [ ] **Step 6: Run, verify, commit**

```bash
npm test && npx tsc -b --noEmit && npm run lint && npm run build
git add src/styles/chrome.css src/styles/base.css music.html docs/superpowers/specs/2026-09-11-portfolio-overgrowth-rebuild-design.md
git commit -m "feat: let each room spend its own accent colour"
```

---

### Task 3: Workshop becomes a cottage in a northern spruce forest

**Files:**
- Modify: `workshop.html`, `src/styles/workshop.css`, `tests/workshop-page.test.ts`
- Modify: `docs/superpowers/specs/2026-09-11-portfolio-overgrowth-rebuild-design.md` (§8.4 amendment)

**Interfaces:**
- Consumes: `.stack` / `.plate` / `.frame` from `stack.css`, and Task 1's fill rule.
- Produces: the image slots Task 5 fills.

#### Why, in the owner's words

> "Instead of doing a workshop, kinda have a little cottage or something in some nature place…
> I still wanted to be stuck with the theme of nature. And once you go inside the little
> cottage, you see everything set up: a little workshop."

> "I want the cottage to be in a spruce forest. If the first forest will be like a jungle, I
> want this one to be a northern spruce or redwood forest, just some more northern style
> compared to the jungle of the first."

The current Workshop hero is an interior workbench — the one room on the site with no
landscape in it, which breaks the concept the other three share. A cottage in a spruce forest
keeps the nature theme and **earns** the interior by making you arrive at it.

**All page content stays.** The `RE—` acts, the manufacturing section, the Resell Assistant
link, and the real before/after photographs are unchanged. Only the hero and its framing move.

- [ ] **Step 1: Amend spec §8.4**

Replace the "workbench hero" framing with the exterior-then-interior structure. Keep every
other part of §8.4 — the `RE—` device, the three acts, "Where the hands came from", the tool
link, and **the photography integrity line, verbatim and untouched**.

Record the biome contrast, because it is the point:

| | Home (§8.1) | Workshop (§8.4) |
|---|---|---|
| Biome | jungle / rainforest | northern spruce |
| Structure | tangled, horizontal, dense understory | vertical, tall straight trunks, clear floor |
| Light | diffuse green gloom | shafts through a high canopy |
| Colour temp | warm green, yellower | cold blue-green, greyer |

- [ ] **Step 2: Restructure `workshop.html`'s opening into two stacks**

Currently the page opens with one `.stack.page-hero` (the workbench) followed by a
`#intro` section carrying the line *"Three verbs, and they're all the same one."*

Replace both with two stacks. **Three layers each — back, copy, front — per the Global
Constraint.** The `#intro` section is **absorbed** into the second stack's copy plate, so the
page gains a stack but loses a section and the added scroll is modest.

```html
<!-- ── EXTERIOR: you arrive ── -->
<section class="stack page-hero" id="arrive">
  <div class="stack-view">
    <div class="plate plate--back">
      <figure class="frame" data-label="Workshop L1 — cottage-far">
        <img src="/assets/img/cottage-far.webp" alt="" loading="eager" />
      </figure>
    </div>
    <div class="plate plate--copy">
      <h1 class="display">Workshop</h1>
      <p class="lede">Finding things, fixing things, and letting them go again.</p>
    </div>
    <div class="plate plate--front">
      <figure class="frame" data-label="Workshop L3 — needles-near">
        <img src="/assets/img/needles-near.webp" alt="" loading="eager" />
      </figure>
    </div>
  </div>
</section>

<!-- ── INTERIOR: you go in ── -->
<section class="stack" id="inside">
  <div class="stack-view">
    <div class="plate plate--back">
      <figure class="frame" data-label="Workshop L4 — bench-far">
        <img src="/assets/img/bench-far.webp" alt="" loading="lazy" />
      </figure>
    </div>
    <div class="plate plate--copy">
      <h2 class="display">Three verbs, and they&rsquo;re all the same one.</h2>
    </div>
    <div class="plate plate--front">
      <figure class="frame" data-label="Workshop L6 — bench-near">
        <img src="/assets/img/bench-near.webp" alt="" loading="lazy" />
      </figure>
    </div>
  </div>
</section>
```

`#inside` mirrors Home's `#thesis` stack, which already puts an `h2.display` on a copy plate
between two image plates — so this is an established shape, not a new one.

**The page must still have exactly one `<h1>`** (`tests/sitewide.test.ts` enforces it). The
exterior stack owns it; `#inside` uses `h2`.

- [ ] **Step 3: Give the interior stack a shorter runway**

In `src/styles/workshop.css`:

```css
/* The exterior hero is the page's signature and keeps the full runway. The
   interior stack carries one line, so it gets less — more scroll for less
   content is backwards. Precedent: .cs .stack in case-study.css. */
#inside { --stack-h: 150vh; }
```

Confirm the number in the browser and change it if 150vh feels wrong; say what you picked.

- [ ] **Step 4: Ruling to implement — three layers, cottage inside the back plate**

The cottage is **painted into `cottage-far.webp`**, not given its own plate.

**Why**, recorded so it can be revisited: a separate cottage plate would parallax at its own
rate and make the approach feel deeper — a real argument. But it would be a fourth layer,
which the Global Constraint reserves for Home's signature hero; it needs one more generated
image; and cutting a building out cleanly is Tier 3 work (see Task 4). Depth here comes from
the `needles-near` front plate instead.

**Upgrade path if it reads flat once real images exist:** promote the cottage to its own plate
between back and copy. Cheap to try later, and a building's hard edges make it the one subject
on this site where an alpha cutout is actually reasonable.

- [ ] **Step 5: Update `tests/workshop-page.test.ts`**

It currently asserts the old single-hero shape. Update it to assert the new structure, and
**assert structure, not prose** — the owner intends to rewrite this copy himself:

- both stacks exist, in order: `#arrive` then `#inside`
- `#arrive` carries the page's single `<h1>`; `#inside` carries an `<h2>`
- both stacks have exactly three plates (`--back`, `--copy`, `--front`), honouring the
  three-layer constraint
- the four image slots are referenced: `cottage-far`, `needles-near`, `bench-far`, `bench-near`
- the three acts still run `rescue` → `renew` → `resell`
- the five before/after photographs are still referenced, still carry `data-own-photo="true"`,
  still have real alt text, and the files still exist
- eBay and Mercari still appear nowhere in `.workshop__shops`

- [ ] **Step 6: Run, verify, commit**

```bash
npm test && npx tsc -b --noEmit && npm run lint && npm run build
```

Then browser-check `/workshop.html` at 1440×900 and 390×844: both stacks render, the four
slots show labelled placeholders at full plate size (Task 1's fix), the page has one `<h1>`,
and there is no horizontal scroll.

```bash
git add workshop.html src/styles/workshop.css tests/workshop-page.test.ts docs/superpowers/specs/2026-09-11-portfolio-overgrowth-rebuild-design.md
git commit -m "feat: arrive at the workshop through a spruce forest"
```

---

### Task 4: Prove the layering pipeline before spending money

**Files:** one throwaway image, deleted at the end of the task. Possibly `src/styles/stack.css`.

**This task exists to stop Task 5 wasting money.** It is cheap insurance: one image, one
measurement, one decision.

#### The problem it de-risks

The owner asked for images *"with no background and that are perfectly cut out with no pixels
that are messed up so that they can cleanly be put over each other."*

**AI alpha cutouts halo**, and they halo worst on exactly what the front plates need — needles,
boughs, grass, mist — because those are thousands of thin semi-transparent edges. This project
already learned it once; spec §7 says of the hero's front trunks:

> "Alpha cutouts from image models halo; out-of-focus trunks in fog are just blurred vertical
> bars, so CSS does it better."

**The strategy, ranked:**

- **Tier 1 — don't generate it.** Fog, haze, vignettes, light shafts, blurred out-of-focus
  trunks: CSS beats generated alpha, costs nothing, never haloes. The hero's seven trunks
  already work this way.
- **Tier 2 — blend modes instead of alpha.** Ship an **opaque** image on a flat background and
  let CSS remove the background arithmetically. No cutout, no matting, no fringe, and soft
  edges composite perfectly.
  - **Dark element in front** (needles, boughs, silhouettes): generate on **pure white**,
    composite with `mix-blend-mode: multiply`.
  - **Light element in front** (mist, god rays, dust): generate on **pure black**, composite
    with `mix-blend-mode: screen`.
- **Tier 3 — true alpha.** Hard-edged opaque objects only. Expect retries.

- [ ] **Step 1: Generate ONE throwaway front-plate image**

Use the `image-gen` skill. A few dark spruce boughs entering from the left edge only,
occupying well under half the frame, rest of frame **flat pure white**, 35mm, shallow focus.
Cheapest available quality — this file is deleted at the end of the task.

- [ ] **Step 2: Wire it into `workshop.html`'s `#arrive` front plate and apply the blend**

**The gotcha that will cost an afternoon if missed:** `mix-blend-mode` blends an element with
its backdrop *within the nearest stacking context*. `.plate` sets `will-change: transform`
(`stack.css:16`), which **creates a stacking context** — so a blend mode on the `.frame`
*inside* a plate blends only against that plate and does nothing useful.

**Apply the blend to the `.plate` itself:**

```css
.plate--front { mix-blend-mode: multiply; }
```

Confirm no ancestor sets `isolation: isolate`, and that `.stack-view`'s `overflow: hidden`
does not interfere.

- [ ] **Step 3: Measure whether it actually works**

In a browser at 1440×900 and 390×844:
- The white background is **gone** — no grey wash, no visible rectangle edge.
- The bough edges show **no fringe or halo** against the plate behind.
- The plate still parallaxes (the blend must not break the transform).
- `prefers-reduced-motion` still collapses the stack correctly.

Screenshot both. **This is a judgement call as much as a measurement — show the owner.**

- [ ] **Step 4: Decide, record, and clean up**

Write down which tier each planned front-plate slot should use, based on what you saw. If
multiply worked, Task 5 generates every dark front element on pure white and no alpha is
needed anywhere. If it did not, say so plainly and propose the alternative **before** Task 5
spends anything.

Delete the throwaway image. Keep the CSS only if it is proven.

- [ ] **Step 5: Commit whatever survived**

```bash
git add -A
git commit -m "feat: composite front plates with a blend mode instead of alpha"
```

---

### Task 5: Generate the image set

**Files:** `assets/img/*.webp`

**Do not start until Tasks 1 and 4 are complete.** Task 1 decides the dimensions; Task 4
decides whether front plates need alpha at all.

**STOP AND ASK THE OWNER BEFORE GENERATING.** This costs real money and he has said so twice.
Present: the slot list, the per-image dimensions, the estimated spend, and Task 4's composite
screenshot. Generate nothing until he approves.

**Use the `image-gen` skill.**

The per-image prompts and dimensions from the previous plan are still valid and are preserved
at `.superpowers/sdd/2026-09-11-overgrowth-3-music-and-workshop/task-5-brief.md`. Read it —
but apply these changes.

#### Changes to that brief

- **The Workshop slots changed** (Task 3). `bench-far` / `bench-near` move from the hero to
  the `#inside` stack — same images, new home. **Two new exterior slots:**
  - `cottage-far` — back plate of `#arrive`. Tall spruce trunks receding into cold mist, a
    **small cottage** in the middle distance with **one lit window**. Cold blue-green, flat
    overcast light, quiet in the centre third (the title sits over it). The lit window is the
    only warm element in the frame and the page's focal point.
  - `needles-near` — front plate of `#arrive`. Sparse dark boughs entering from **one** edge
    only, well under half the frame, rest flat background per Task 4's ruling.
- **Re-examine every other slot against Task 4's tiers.** Several probably want CSS or a blend
  mode rather than the alpha the old brief assumed. `fronds-near` is the obvious case — its own
  brief already hedges, *"needs real alpha or a pure black background."*
- **Compose for the mobile crop.** Task 1 Step 6 establishes that a 3:2 source keeps only
  **≈25% of its width** at 390×844. Keep every subject inside the **centre quarter** of the
  frame, or accept it is invisible on a phone. This single rule prevents most wasted renders.
  If a subject cannot survive that crop, say so and propose art direction (a `<picture>` with a
  portrait source) instead of regenerating blindly.
- **Remember the overscan.** `.plate` is `inset: -12% -3%`, so the outer ~12% top and bottom is
  parallax travel margin and never guaranteed visible.

#### Spruce vs redwood — decide on the first render, not in advance

The owner said "spruce or redwood." Redwood's warm bark harmonises with the workshop's ochre,
but it sits close to clay `#cf6b3e` — the reserved "this is clickable" signal, which scenery
must not dilute — and it weakens the lit window, which only works because it is the one warm
thing in a cold frame.

**Recommendation: spruce-dominant with redwood's sense of scale.** Cold trunks, massive and
close, window as the only warm pixel. If redwood bark appears, keep it dark and desaturated.
**Judge this on the first test render.**

#### Making the set look like one shoot

- [ ] **Step 1: Generate ONE reference image and get it approved** before anything else. Use
      it as the style anchor for every subsequent prompt.
- [ ] **Step 2: Hold the camera constant** across every prompt: 35mm, one aperture feel, one
      named light direction, one time of day (overcast), one grade. Negative list on every
      prompt: neon, glowing, cyberpunk, lens flare, HDR, oversaturated, vaporwave, text,
      watermark, logo, CGI render, plastic sheen.
- [ ] **Step 3: One cheap test render per layer role** — one back, one mid, one front —
      composited together at real slot sizes. **Show the owner the composite.** Approve the
      *look* before generating the *set*.
- [ ] **Step 4: Generate finals** in the old brief's order, which is cheapest-decision-first.
      **Never batch all sixteen.** If one lands wrong, regenerate that one — do not adjust the
      other fifteen to match a mistake.
- [ ] **Step 5: Judge layers composited, never alone.** A back plate that looks beautiful on
      its own is usually too busy to sit behind type.

#### Layer roles are not interchangeable

- **Back plate** (moves least, sits behind the wordmark): **no subject.** Low contrast, soft,
  quiet centre third. Anything competing for attention fights the type.
- **Mid plate:** the subject. The only layer allowed to be interesting.
- **Front plate:** sparse, enters from one edge, well under half the frame, rest flat
  background. `stack.css:32` already assumes this —
  `.plate--front .frame.is-missing { opacity: 0.25 }` exists because "the real image is a
  sparse alpha overlay."

- [ ] **Step 6: Output discipline and commit**

WebP at ~q72. Never commit the raw PNG; if generation produces one, convert and delete the
intermediate. Report each file's dimensions and byte size — a 4MB hero is a defect even if it
looks right.

**`assets/img/workshop/` is untouchable.** If any file under it appears in `git diff`, you have
made a serious error — check.

```bash
git add assets/img
git commit -m "feat: add the generated image set"
```

---

### Task 6: Final pass and launch

- [ ] **Step 1: Full verification**

```bash
npm test && npx tsc -b --noEmit && npm run lint && npm run build
```

All four pass, zero skips. Confirm all five pages in `dist/`.

- [ ] **Step 2: Re-run the checks the images invalidate**

With real images in place, redo what could only be guessed at with placeholders:
- Every `.plate > .frame` still matches its plate exactly (Task 1's measurement, re-run).
- Hero images fill their frames at 1440×900 and 1920×1080 — no letterboxing, no background
  band, no distortion. **This is the owner's original complaint; it is the acceptance test.**
- Every subject survives the 390×844 crop.
- **Re-judge the front-trunk tonality** in `stack.css` (`.trunk--1` … `.trunk--7` and their
  `--haze` values). It was tuned against a flat placeholder ground and has never been seen
  against real `trees-back.webp` / `canopy-far.webp`. Report your judgement; change only if
  visibly wrong.
- Re-check ochre vs clay on Workshop now that real warm bark may be in frame. Plan 3 measured
  ΔE76 = 34.9 between the tokens — comfortably distinguishable — but that was against an empty
  plate.

- [ ] **Step 3: Walk spec §15**

Two lines that could not be checked while the images were placeholders are now live: hero
composition/fit, and "no generated image is presented as a real refurbished piece" (confirm the
workshop photographs are still the owner's own and still ungraded).

- [ ] **Step 4: DO NOT DEPLOY**

A production deploy of the owner's personal domain is his to run. Confirm `vercel.json` is
present and correct (`{ "cleanUrls": true, "trailingSlash": false }`), then hand him this check:

> In a fresh browser, load `yosefpilip.com/projects/cache-it` directly. It must render the case
> study, not 404. This cannot be verified locally — `cleanUrls` is a Vercel rewrite. `vite dev`
> resolves that URL by a different mechanism (its own HTML-fallback middleware), so a local
> success proves nothing about production.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: final pass for the Overgrowth image set"
```

---

## Plan 4 self-review

**Ordering is load-bearing, not cosmetic.** Task 1 must precede Tasks 4 and 5 because it
decides the box every image is cropped into; generating first would mean paying for images
fitted to a broken geometry. Task 4 must precede Task 5 because it decides whether front
plates need alpha at all, which changes how every front-layer image is prompted. Task 3 must
precede Task 5 because it creates two of the slots.

**Spec coverage.** §15 colour-count → Task 2 (amended). §8.4 Workshop → Task 3 (amended, with
the photography integrity line preserved). §12 images → Tasks 4 and 5. §7 three-layer
constraint → honoured explicitly in Task 3 Step 4. §15 definition of done → Task 6.

**Test strategy.** Task 1's test guards a markup contract rather than layout, because jsdom has
no layout engine — the geometry itself is proven in a browser with real measurements, and both
before and after numbers are already in the plan. Task 3's tests assert structure rather than
prose, deliberately, because the owner intends to rewrite the copy himself.

**Two money gates.** Task 4 is one throwaway image. Task 5 stops and asks before spending, with
a composite in hand. Neither can be skipped by an agent running unattended.

**Known limitation, stated rather than hidden.** Task 4's blend-mode approach is the
recommended path but is unproven in this codebase — that is precisely why it is its own task
with its own measurement, ahead of any real spend. If it fails, Task 5 does not start; the plan
routes back to the owner.

**Carried forward, not addressed here:** the overlay body's position vs. centring, and the
case-study rail being desktop-only. Both are parked design decisions awaiting the owner, and
both are recorded in `docs/overgrowth-plan4-handoff.md` §4 along with the smaller residuals
(`wght@300` unused, the Depop `↗` glyph, `portfolio.live` pointing at the profile rather than
the repo, `coverflow.css`'s dead `box-shadow` transition entry, and spec §10's dropped
"Screens grid").
