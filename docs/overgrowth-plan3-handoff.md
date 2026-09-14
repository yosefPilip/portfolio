# Overgrowth — handoff into Plan 3

**Written 2026-09-14, at the end of Plan 2.** Everything here comes from the owner
directly or from a verified check. Plan 3's session should read this BEFORE
starting, because several items reverse or supersede earlier decisions.

---

## 1. Owner decisions — new, authoritative, and some reverse earlier ones

### City is now publishable — this REVERSES spec §14
The owner previously declined to publish a city, and Plan 1 removed the "Based"
row from Home's About spec list because of it. That is now reversed.

> "You can add city if you want. Just say Bay Area and San Diego or something
> because I'm in both."

Ship **Bay Area & San Diego**. Restore the `Based` row in Home's `.spec` list in
`index.html`. Note this contradicts `docs/resume.md`'s "Notes" section, which still
lists a city as unknown — the résumé is a transcript of what the owner supplied on
2026-09-13 and should NOT be edited; this file is the later word.

### eBay and Mercari handles — dropped, not unknown
> "drop for now. I can add later."

Do not ship `—` placeholders for them. Leave them out entirely. Depop remains
`depop.com/explosef`.

### DJ Music Sorter — no longer unknown, and it has a real source
The owner confirmed the project exists and is documented:

> "The DJ musicians folder exists in my dev folder. I was working on it with
> Claude and never got to finishing it, but the information's there."

Source of truth: **`C:/Users/yosef/Dev/dj-tool/docs/superpowers/specs/2026-06-15-dj-tool-design.md`**
(and the plan beside it). Verified contents:

- A **desktop DJ music organization tool** — Electron shell, React + Vite + Tailwind
  frontend, Python 3.13 + FastAPI backend on port 8765, SQLite alongside the library.
- Three modules: a **gamified "Sorting Deck"** song categorizer, a **drag-and-drop
  Set Builder**, and a **Spotify-powered Discover/Downloader**.
- Audio analysis via **librosa** (BPM, key, energy) and **mutagen** (ID3 tags);
  `spotipy`, `scdl`, `yt-dlp` for discovery/download.

There is a SECOND, separate DJ project at `C:/Users/yosef/Dev/rekordbox-cleanup`
(design spec dated 2026-08-26, status "Approved, in implementation"): a Rekordbox/USB
library cleanup tool that fixes duplicates, corrupt/truncated tracks, and wrong
BPM/beatgrids across a 984-file library. **Ask the owner whether this is the same
"DJ Music Sorter" row, a second project row, or should stay unlisted.** Do not merge
the two descriptions on your own — they are different tools.

Replace the `—` placeholders in `src/data/projects.ts` (`music-sorter`) and in
`projects.html`'s matching row, and delete the `// OPEN:` comments.

---

## 2. Bugs the owner found in the shipped Plan 2 work — fix these in Plan 3

These were found by the owner in a real browser after Plan 2 closed. Items 1–3 are
all in the tier-3 case-study overlay.

### 2.1 CRITICAL — the overlay will not scroll with a wheel or trackpad
> "I can't actually scroll in the cache case study when it's opened up. I can't use
> scroll wheel or the touchpad. I have to use the sidebar."

Only the scrollbar works. This makes the flagship case study effectively unreadable.

**Almost certainly a Lenis conflict.** `src/shared/caseStudy.ts`'s `open()` calls
`getMotion()?.stop()`, and `src/styles/projects.css` gives `.cs-overlay`
`overflow-y: auto`. Lenis captures wheel events globally, so a stopped Lenis appears
to swallow wheel/trackpad input before the overlay's own scroll container sees it.

**This was predicted and not caught.** Task 4's reviewer wrote, verbatim: *"the
overlay's own `overflow-y: auto` will fight Lenis's global wheel capture — the overlay
may not scroll at all."* The controller added `getMotion()?.stop()` to fix the
background-scroll half and never verified the foreground half, because every browser
check used programmatic `.click()` and `evaluate()`, never a real wheel event.

**Use `superpowers:systematic-debugging` on this — do not guess.** The likely fix is
Lenis's `prevent` option (tell Lenis to ignore events originating inside `#csOverlay`)
rather than `stop()`, but confirm against the installed Lenis version's API before
changing `src/shared/motion.ts`. **Verify with a real wheel event**, not a
programmatic scroll — e.g. Playwright's `mouse.wheel()`.

### 2.2 The overlay's content is pinned to the left half of the screen
> "All the information for some reason is just stuck to the left half of the screen."

`src/styles/case-study.css` sets `.cs-body { margin-inline: 0 }` inside the
`@media (min-width: 1100px)` block, which is correct when the 232px rail occupies the
first grid column — but `.cs-overlay .cs { grid-template-columns: 1fr }` removes that
column, leaving an 860px body hugging the left edge of a full-width overlay. Centre it
in the overlay context (or fix it as part of 2.3, which removes the cause).

### 2.3 The owner wants the left rail VISIBLE inside the overlay
This reverses a Plan 2 design decision. `case-study.css` currently has
`.cs-overlay .cs-rail { display: none }` with the rationale "inside the overlay the
rail is redundant — the overlay has its own close." The owner disagrees:

> "I would like it to open up to its own page almost where you could just read about
> cache or go to the next one. And after opening it up, there should be a side left bar
> that can take you to parts of the page and/or go to other products."

So: show the rail in the overlay, keep the section links (`#idea`, `#map`, …) and the
other-projects links working there. Two things to handle that the standalone page does
not have to:

- **In-page anchors inside the overlay.** `initChrome()` binds `a[href^="#"]` at page
  load; the overlay's rail links are injected later, so they will not be bound, and
  `scrollIntoView` would target the document rather than the overlay's scroll
  container. Needs deliberate handling.
- **The "other projects" links** point at `/projects.html#slug`. From inside the
  overlay those should close the overlay and go to the row, not full-page navigate.

### 2.4 The clay `+` marks are in a dead corner
> "I do like the Clay Plus marks. However, I feel like they're just off to the right
> side, and you can't really see them or notice them… it's currently on the almost
> bottom right, which doesn't really make sense. I'd probably put it in the middle or
> the top right side. That's your call."

Keep them — he likes them. Move them somewhere they read as an affordance. They are
currently the third grid column of `.work-row--button` in `src/styles/projects.css`,
baseline-aligned, so they sink toward the row's lower right. Top-aligning them to the
first row (beside the project name) is the smallest change that meets the note.

### 2.5 Image frames do not fill the screen properly
> "I just hope certain dimensions and pictures will go in well, because some of the
> balance for the pictures aren't really showing up right — not filling up the whole
> screen when I'm on my monitor nor when I'm on my desktop or laptop."

Observed with placeholder frames only (`assets/img/` does not exist yet). Plan 3
generates the real images, so re-check aspect ratios and `.plate { inset: -12% -3% }`
against real files at both laptop and external-monitor widths before calling it done.
Plan 1's ledger carries a related open item: trunk tonality was tuned against a flat
placeholder ground and needs re-checking once `trees-back.webp` and `canopy-far.webp`
exist.

---

## 3. Carried forward from Plan 2's ledger

Full detail with reasoning in
`.superpowers/sdd/2026-09-11-overgrowth-2-projects-and-cache-it/progress.md`.

- **Deploy gate.** `/workshop.html` does not exist — 8 links across `index.html`,
  `projects.html` and `projects/cache-it.html` point at it. `music.html` still loads
  the deleted `/src/styles/site.css` and the no-op `src/shared/site.ts` shim. **Delete
  that shim once `music.html` is rewired onto `src/shared/chrome.ts`** — Vite's
  multi-page build hard-fails while any page still references it.
- **`.work-row` CSS duplication.** `home.css` and `projects.css` carry near-identical
  blocks. Plan 2 deferred extraction to Plan 3, when `music.css` becomes the third
  consumer. Two corrections from the final reviewer: it belongs in a **new
  `src/styles/work-list.css`**, not `chrome.css` (which is scoped to page chrome, and a
  work list is content); and it is **cheaper than assumed**, because both elements
  already carry the `.work-row` class, so no new class name is needed. Note `.work-row`
  is currently a dead class in the projects bundle.
- **`src/lib/projectFilter.ts` is dead code** — nothing imports it but its own test, and
  Vite tree-shakes it to zero bytes. Either delete it with its six tests, or have
  `initProjectsIndex` derive its count from `countByCategory` so the tested path is the
  shipped path. Parked, not decided.
- **The ~100ms flash on `/projects.html`.** Plan 2 inverted the no-JS default so details
  ship expanded and JS collapses them. Measured: CSS ready ~56ms, enhancer ~160ms. The
  owner was shown this and said the structure bothered him more than the flash — treat
  it as low priority. **Do not** use `.js .work-detail { display: none }`; it conflicts
  with the `hidden` property the enhancer toggles and breaks expansion. The safe form is
  an inline head script plus a `:not([data-enhanced])` guard and an attribute set at init.
- **No dedicated regression test** for the second in-flight guard in `caseStudy.ts`
  (the one after `await response.text()`).
- **Pre-existing concurrent-click race** — two rapid clicks from the same `startPath`
  both pass the guards; harmless while only one case study exists.
- **`portfolio.live`** points at the GitHub *profile*, labelled "GitHub ↗". If the repo
  is public, point it at the repo instead.
- **Spec §10 item 8 ("Screens grid")** was dropped from the Cache It case study because
  `assets/img/` did not exist. Revisit once images land.
- **`wght@300`** is loaded by every page's font link and never used.

---

## 4. Process note for Plan 3's session — read this

Plan 3 (`docs/superpowers/plans/2026-09-11-overgrowth-3-music-and-workshop.md`) is dated
**2026-09-11**. It was written before Plan 1's final fix wave AND before all of Plan 2.
**It will be stale in the same ways Plan 2 was**, and that staleness is what made Plan 2's
execution long. Plan 2's pre-flight scan found seven conflicts; expect comparable.

Known-stale things to check for in Plan 3's text before executing:

- It may tell you to create `src/styles/chrome.css` or extract chrome rules — **already
  done** in Plan 1.
- Any new stylesheet it writes will be swept automatically by `tests/base-css.test.ts`
  via `tests/stylesheets.ts`, which enumerates `src/styles/*.css`. Any rule that renders
  at ≥32px **must** use the `.title-h2` utility or carry negative tracking, or a
  currently-green test turns red. The same trap cost Plan 2 two separate fixes.
- Any `.work-row`-style grid it writes needs `.work-row__name { grid-column: 1 / -1 }`
  in its ≤700px query, or names render right-aligned above left-aligned text.
- Any page it creates must carry the full chrome (`.site-header`, `#mobileMenu`,
  `.site-footer`) — Plan 2's case study shipped without it and had no navigation below
  1100px.
- Any new page must be added to `vite.config.ts`'s `rollupOptions.input` or it is never
  built, while every test still passes.
- Any page whose `<main>` can be lifted into an overlay needs its stylesheet imported by
  the *hosting* page's stylesheet too.

Run the pre-flight conflict scan the skill asks for, rule on everything it surfaces
before Task 1, and expect the résumé + this file to beat the plan on any disagreement.
