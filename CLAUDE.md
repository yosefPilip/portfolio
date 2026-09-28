# yosefpilip.com — working agreement

Read this before planning or executing anything. It exists so you don't have to ask
Yosef things he has already answered.

---

## 1. What the finished product is

A personal brand hub — one link that works for a recruiter, a Zip Launchpad mentor, a
promoter, and a friend. Not a recruiting funnel, no single call to action.

Three things define "done," in the owner's words:

- **Scroll-driven animation.** The site is felt by scrolling it. Layered parallax
  depth — background, copy, foreground moving at different rates — is the signature,
  not decoration. Every page is a different natural setting rendered as scroll-linked
  layers.
- **It must not look AI-generated.** No template posture, no default component-library
  look, no stock-SaaS gradient-and-card layout. If a section could have come out of any
  builder, it's wrong.
- **Unique.** Distinctive typography, real editorial layout decisions, asymmetry where
  it earns attention.

**The concept in one line:** *the page is the soil; the images are the growth.* Green
lives in the photography, never in the interface. The UI is dark, neutral,
bone-on-charcoal with one warm clay accent. **If UI chrome starts turning green, the
concept has broken.**

Four rooms, one building: Home, Projects, DJ & Music, Workshop. Shared fixed palette
(`--fg` bone `#f0efe9` — never pure white; `--accent` clay `#cf6b3e` — action only),
per-room `--bg`/`--accent-2` swapped by `[data-room]`. No hardcoded hex anywhere; no
shadows used as fake light (a zero-blur focus ring is a focus ring, not a shadow).

Full detail: [the design spec](docs/superpowers/specs/2026-09-11-portfolio-overgrowth-rebuild-design.md).

---

## 2. Pace — build fast, don't polish forever

**A good page should take about an hour. A scrolling bug should not.**

That's the calibration. If a bug has eaten more than ~20 minutes and it doesn't block
shipping a page, log it and move on. New surface beats old polish.

Order of work in any plan, regardless of task numbering:

1. Pages and features that don't exist yet.
2. Guards and tests that protect what now exists.
3. Bugs and polish on what already shipped.

A bug only jumps the queue if it makes a page unusable or unshippable.

**Why this is written down:** Plan 3 spent 80 minutes on remediation — copy fixes,
overlay bugs, two CSS declarations, a stylesheet extraction — before the first real
page task dispatched. Remediation produces commits, so it feels like progress, but it
moves nothing you can see.

---

## 3. Tests always run. Review rounds are what gets cut.

**Never skip the test suite.** `npm test`, `tsc`, and `lint` run on every task. The
guards exist because they catch real regressions — the ≥32px negative-tracking rule and
the no-hardcoded-hex sweep have each already caught live bugs. Do not weaken, skip, or
`.skip()` a test to move faster.

What gets calibrated is **agent round-trips**, not verification:

| Depth | When |
|---|---|
| Implementer → review → fix → re-review | [src/shared/](src/shared/), scroll/history/focus behavior, anything with a prior browser-only Critical |
| One review pass | Greenfield pages, new stylesheets, copy — disjoint file sets |
| No review agent | Dead-code deletion, pure extraction with no behavior change |

Browser-verify with **real events** (`page.mouse.wheel()`), not programmatic
`.click()`/`evaluate()`. That gap is exactly what let the overlay ship unscrollable.

---

## 4. Parallelize — with one real caveat

If the pre-flight conflict scan clears two tasks as sharing no source files, dispatch
them together.

**But source-file disjointness is not enough.** Concurrent agents collide on build
artifacts: two `npm run build` runs both write `dist/`, and two full `npm test` runs
each fail on the other's half-written page. When running agents in parallel:

- Forbid `npm run build` in the parallel agents; the controller runs it once after both land.
- Scope each agent to its own test file plus the directory sweeps that pick up its new
  stylesheet, and tell it to ignore sweep failures naming the other agent's files.
- Have each agent `git add` explicit paths and retry once on `index.lock`.

---

## 5. Standing facts — do not ask, do not invent

**[docs/resume.md](docs/resume.md) is canon for every fact and number on the site.**
Never ship a number that isn't there. Unknown values ship as a literal `—` plus an HTML
comment naming what belongs there — never a fabrication.

Yosef Pilip — CS student at San Diego State (B.S., Aug 2024 – Jun 2028 expected, GPA
3.8) and an AI developer. Builds full-stack LLM-powered apps and internal automation.
Also a DJ. yosefpilip@gmail.com · github.com/yosefPilip · linkedin.com/in/yosefpilip

- **AI Software Developer, CloudGeometry**, May 2025 – Present. Slack HR bot
  (Python/Gemini) for ~100 employees, 3 days → same-day; role-based HR platform saving
  $8k/yr; Apps Script security auditing replacing 40 hrs/month.
- **Founder & CEO, Cache It**, Aug 2026 – Present. NFC art discovery app (React/Vite +
  FastAPI), SDSU Zip Launchpad Fall 2026.
- Leadership: AEPi Events (50-person team, $13k budget, 400+ turnout), Hillel Business
  Initiative, Tzofim North America.
- Projects: Batch Podcast Generator, Resell Assistant (Claude MCP), this site.

**Traps that have already caused rework — get these right the first time:**

- Aztec Robotics is a **club membership**, not a leadership role. "President & Software
  Lead" has no source and stays dropped.
- Russian is **Advanced/Conversational**, never "Native."
- Cache It uses **NFC** (upgrade path: NTAG 424 DNA). Never image recognition.
- CloudGeometry is **one continuous employer** with a promotion, IT Automation Engineer
  (May 2025 – Jan 2026) → AI Software Developer (Jan 2026 – Present). One entry, not two.
- Cache It is an Experience entry, but Home's Experience section deliberately lists only
  the four non-Cache-It roles — it gets its own case study. That's a layout decision,
  not a contradiction.

---

## 6. Decisions already made — don't re-ask these

| Question | Answer |
|---|---|
| City | **"Bay Area & San Diego."** Publishable. Reverses spec §14 and the résumé's Notes. |
| eBay / Mercari handles | **Dropped**, not unknown. No `—` placeholder. Depop is `depop.com/explosef`. |
| DJ Music Sorter | Real, documented at `C:/Users/yosef/Dev/dj-tool/docs/superpowers/specs/2026-06-15-dj-tool-design.md`. |
| The Rekordbox cleanup tool | **Unlisted.** Projects keeps six rows. Do not merge it with DJ Music Sorter. |
| Home's project list | **Gone, 2026-09-22.** Replaced by ONE featured block for Cache It, wearing Cache It's own palette, mark and font stack from `Dev/personal/Cache It` so it reads as a portal into the product. Live app link first, then the hook, then the case study. Brand tokens are `--ci-*` in tokens.css, the one sanctioned exception to the fixed palette, scoped to `.portal`. |
| Prose punctuation, sitewide | **No em dashes, no colons** in body copy, on every page. Hyphens linking two words are fine, and en dashes stay for ranges. Titles and `data-label` ids are exempt. Guarded by `tests/punctuation.test.ts`. |
| Image re-encoding | Safe to re-encode in place at WebP q82 — EXCEPT four. **`ridge-near.webp` must stay 2048x1600** (`--front-img-h` in stack.css pins the crest maths to its natural height) and it is an alpha matte that degrades badly on re-encode (measured mean delta 4.4 for a 10% saving — not worth it). **`ice-plane.webp` must stay 1536x1216** (music.css computes the fossil's diameter from it). **`cottage-face.webp` must stay 2560x2048 and `bench-far.webp` at its q96 export** (the Workshop dolly scales the facade up to 8x and holds the interior full-screen; the q82 pass lost 23% of the interior's detail and a visitor reported the room as blurry, restored 2026-09-28). Always measure the pixel delta against the original before keeping a re-encode. |
| Favicon & social card | `public/` holds them, generated by hand from the site's own tokens and the jungle plate — a bone Y on charcoal in Georgia (already the fallback face in `--font-display`), and a 1200x630 card. `og:image` must be an ABSOLUTE url or the unfurl silently shows nothing. Origin is hardcoded as `https://yosefpilip.com` in all five pages; change it there if the domain differs. |
| Clay `+` marks | **Reversed 2026-09-22.** A user told him they could not tell the rows expanded at all. Now a chevron in a clay ring that flips 180° when open. Do not go back to `+`. |
| Prose punctuation | **No em dashes, no colons** in body copy. En dashes are fine for ranges. Guarded by `tests/home-content.test.ts` on Home. |
| De Anza / CloudGeometry detail | He is **over-indexed** on both. One line each, no tool inventories. "More broad i can do a lot of things." |
| Images | **Generate them — but one at a time, and only after he approves the spend.** Never batch a set in one go: generate one, size it, look at it in the page, then decide on the next. Every image ships correctly sized for its slot and readable on a phone. Until a slot is filled it renders a labelled placeholder — that's the designed fallback, not a failure. |
| `/projects.html` ~100ms detail flash | Low priority. Structure bothered him more than the flash. |

Parked design calls awaiting him — don't spend rounds on them: the case-study overlay
body sitting left-aligned beside the rail rather than viewport-centred, and the rail
being desktop-only below 1100px.

---

## 7. Always stop and ask

- **Deploys.** Vercel or anything outward-facing. Never as a plan step.
- **Image generation, before the first render.** Real spend. Present the slot list,
  dimensions and estimated cost and wait for a yes. After that yes, generate **one image
  at a time** — never a batch — and stop again if the cost or the slot list changes.
- **Design changes nobody asked for.** Surface as a question; don't widen scope silently.

---

## 8. Stack, commands, and the gate

Vite multi-page. Static hand-written HTML + CSS, with React only as islands
(intro animation, name flip-board, Coverflow). Lenis for scroll. TypeScript with
`noUnusedLocals` / `noUnusedParameters` / `erasableSyntaxOnly`. oxlint, no config
file — defaults.

```
npm test && npx tsc -b --noEmit && npm run lint && npm run build
```

All four, green, before calling anything done. The suite is 25 files / ~320 tests
and finishes in about 4 seconds — there is never a reason to skip it.

| Need | Command |
|---|---|
| One test file | `npx vitest run tests/motion.test.ts` |
| One test by name | `npx vitest run -t "moves nearer layers faster"` |
| Watch | `npm run test:watch` |
| Dev server | `npm run dev -- --port 5174 --strictPort` (check `devservers list` first) |
| Judge a scroll stack | `npm run filmstrip -- http://localhost:5174/ "#hero"` |

`tools/filmstrip.mjs` drives the page with **real** `page.mouse.wheel()` events —
Lenis's virtual scroll ignores programmatic `scrollTo`, and that gap is what let
an unscrollable overlay ship once. It captures 8 frames across a stack's runway at
1440×900 and 390×844 and tiles them into one PNG under `scratchpad/`. Use it
instead of asking Yosef to scroll and describe what he sees.

`tools/grade.py` and `tools/checkplate.py` (numpy + Pillow) are the image pipeline:
every generated image gets the same `grade()` so the set reads as one shoot, and
`checkplate.py` gates a multiply plate on corner RGB (must be pure white) and
wordmark-band coverage (≤25%). Never eyeball either.

---

## 9. Architecture — read this instead of the source

### A page is six registrations, not one file

Adding or renaming a page touches six places, and missing one fails quietly —
the page ships unstyled, or the tests pass while the page never builds at all:

1. `<page>.html` at the repo root — or under `projects/` for a case study.
2. `vite.config.ts` → `rollupOptions.input`.
3. `src/styles/<page>.css` — the page's **one** stylesheet (see below).
4. `src/entries/<page>.ts` — the page's **one** module entry.
5. `tests/sitewide.test.ts` — both the `PAGES` array and the `known` internal-link
   set, or every other page's link sweep fails.
6. `src/panel/server/paths.ts` → `ALLOWED`, only if the panel may write it.

### CSS: one stylesheet per page, everything else is a partial

Each HTML page links exactly one `<link rel="stylesheet">`. That file `@import`s
the partials it needs. Nothing is imported from JS — importing in both places
ships the CSS twice.

```
tokens.css      ← the ONLY file allowed to contain a colour literal
  └ base.css    ← reset, type scale, .btn / .panel / .frame / .reveal
      ├ stack.css              parallax plates
      ├ chrome.css             header, mobile menu, footer, .spec, .link
      ├ work-list.css          the project row list (PROJECTS ONLY since 2026-09-22)
      ├ coverflow.css          music only
      ├ case-study.css         imported by projects.css — the overlay lives on the index
      └ layout.generated.css   ← GENERATED. Never hand-edit.

home.css · projects.css · music.css · workshop.css · case-study.css
```

Every page stylesheet must end its imports with `layout.generated.css`.

### Palette: tokens or nothing

`tokens.css` holds the fixed sitewide values in `:root` and swaps `--bg`,
`--bg-deep`, `--surface`, `--surface-tint`, `--accent-2` per
`[data-room="home|projects|music|workshop"]`. Everything else uses `var()` or
`color-mix(in oklab, …)`.

`tests/base-css.test.ts` enumerates `src/styles/*.css` **from the directory**, not
from a list — so a new stylesheet falls under every sweep the moment the file
exists. Those sweeps, all sourced from spec §4 and §15:

- Zero hex literals outside `:root` / `[data-room=…]` blocks.
- No `#000` / `#fff` in any form.
- Any rule that can render at **≥32px** carries `letter-spacing` — negative for
  normal case, **≥0.06em positive** for `text-transform: uppercase`. The scanner
  resolves `var(--step-*)` against `tokens.css`, so `font-size: var(--step-h2)` is
  seen for the 44px it can reach. Reach for `.title-h2` rather than redeclaring
  family + size on a new selector; it carries the tracking with it.
- Only `transform` and `opacity` may animate. `top` / `left` / `right` / `bottom` /
  `width` / `height` / `background-position` are banned from `transition`,
  `animation` and every `@keyframes` stop.

This applies to `layout.generated.css` too, which is why `src/panel/cssGenerator.ts`
emits token keys and never a literal.

### Scroll: one rAF loop, one custom property

`src/shared/motion.ts` owns everything scroll-linked. It starts Lenis, runs a
single `requestAnimationFrame` loop, and each frame writes one number — `--p`,
0→1 — onto every on-screen `.stack`. CSS does the rest:

```css
.plate { transform: translate3d(0, calc(var(--p, 0) * var(--rate, 0) * 1px), 0); }
```

No other module may start a rAF loop or a reveal observer. Call `getMotion()` and
cooperate with the handle instead.

- **`handle.lenis` is `null` under `prefers-reduced-motion`.** No instance is ever
  constructed. `stop()` / `start()` / `scrollTo()` stay safe to call and degrade to
  native — never branch on "did motion initialise".
- Anything that opens over the page (mobile menu, case-study overlay) must call
  `getMotion()?.stop()`. Lenis's virtual scroll ignores `body { overflow }`; the
  `.is-menu-open` body class is only the reduced-motion fallback.
- Depth is encoded in plate **names**, and `tests/stack-depth.test.ts` enforces that
  nearer layers (higher `z-index`) always carry a larger `|--rate|`, desktop and
  mobile. `tests/plate-coverage.test.ts` enforces that the painted surface is
  extended by `--rate` (`height: calc(100% - var(--rate) * 1px)`), because the
  plate's `-12%` overscan is a percentage while the travel is pixels — a bare
  `height: 100%` exposes a bare strip at the bottom of the hero.
- The hero composites with `mix-blend-mode: multiply` on the **plate**, never the
  inner `.frame`: `.plate` sets `will-change: transform`, which creates a stacking
  context and silently kills a blend on a child.

### Images: the frame contract

Every image slot is a real `<img>` at its final path inside
`<figure class="frame" data-label="…">`. While the file is missing, `imageFrame.ts`
marks the frame `.is-missing` and CSS renders a labelled dashed box at the exact
aspect ratio. **That is the designed state, not a failure** — drop the file in and
it works with no code change. `--ar` sets the ratio inline; `--img-zoom` and
`object-position` are written per slot by the panel.

`data-label` is mandatory — `tests/sitewide.test.ts` fails a page without it, and
it is also the key the panel stores framing under.

`assets/img/workshop/` holds nine photographs Yosef took of furniture he actually
refurbished. **Never generate, replace, re-export or grade these.**

**`docs/image-slots.md` is the per-slot ledger — update it in the same commit as
any render.** It records tier, status, spend and why each roll was accepted or
rejected, and it is what stops the next session re-buying an image that exists.
`docs/image-rooms-queue.md` is the settled creative direction and the sitting
order; it is deliberately not planned further in advance.

### Projects: three tiers, one data module

`src/data/projects.ts` exports `PROJECTS` and is the source of truth for slug,
title, hook, category, year and stack. `tests/projects-page.test.ts` compares
`projects.html` cell-by-cell against it (decoding HTML entities first), so the two
must be edited together. **Row order is fixed by the spec.**

- **Tier 1/2** — `src/shared/projectsIndex.ts`. Filter pills and expand-in-place.
- **Tier 3** — `src/shared/caseStudy.ts` + `src/lib/caseStudyRoute.ts`. A case-study
  link opens an animated overlay with no reload *and* pushes `/projects/<slug>`;
  the same URL cold-loads as a real page, so it stays shareable and indexable. Back
  closes the overlay. `hasCaseStudy` on the project is what makes a slug routable.

**Progressive enhancement here is inverted on purpose — do not "fix" it.** The HTML
ships every `.work-detail` **open** and `.filters` **hidden**, so the no-JS page is
the complete one and pills that filter nothing never render. `initProjectsIndex`
collapses the details it is about to make expandable and reveals the filters it is
about to make work.

Paths: `/projects.html` (vite dev) and `/projects` (Vercel `cleanUrls`) are the same
document. `caseStudy.ts` captures the real path at init rather than hardcoding
either.

### The overlay / menu focus pattern

Both the mobile menu and the case-study overlay set `inert` on
`header, main, footer` — that is the focus trap, and it hides the background from
assistive tech in the same stroke. **Un-inert before restoring focus**, or the focus
call lands on an inert element.

Two footguns already paid for, documented in `shared/chrome.ts` and
`shared/caseStudy.ts`: `querySelector('#' + id)` throws `SyntaxError` on an id like
`2fa` and takes the whole handler with it (use `getElementById`, or walk `[id]`
elements when an open overlay means the document holds two matches), and
`decodeURIComponent` throws `URIError` on a malformed fragment.

### The visual editing panel (`src/panel/`) — in progress

A dev-only in-page editor for image framing and type/colour tokens, built from
[the nine-task plan](docs/superpowers/plans/2026-09-15-visual-editing-panel.md).

**Do not guess how far it got — read the ledger.**
`.superpowers/sdd/2026-09-15-visual-editing-panel/progress.md` carries per-task
status, every review finding, and the rulings behind each deferral. It is
gitignored, so it is local-only and will not survive a clone, but while it exists
it is more current than this file and more honest than the commit log. The
`task-N-brief.md` / `task-N-report.md` pairs beside it are the dispatch record: a
brief with no matching report is a task still in flight.

- `cssGenerator.ts` is pure and token-only: `PanelState` → CSS text. It validates
  every key against runtime allowlists that `satisfies` the types.
- `server/plugin.ts` is `apply: 'serve'`, so the write endpoint structurally cannot
  exist in a production build. `server/paths.ts` is an **allowlist**, not a traversal
  check — a traversal check has to be right about every trick, an allowlist has to
  be right once.
- `src/styles/layout.generated.css` is rewritten wholesale on every Save. Safe to
  `git checkout` at any time; never hand-edit it expecting the edit to survive.

### Sitewide HTML invariants (`tests/sitewide.test.ts`)

Every page: a `data-room` on `<body>`, exactly one `<h1>`, `data-label` on every
`.frame`, `rel="noopener"` on every `target="_blank"`, no banned copy from the old
bio-terminal design (`src/lib/guards.ts`), no invented metrics, and no internal link
to a page outside the known set.
