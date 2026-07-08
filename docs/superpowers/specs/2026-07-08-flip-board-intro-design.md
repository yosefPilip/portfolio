# Flip-Board Intro Animation — Design

## Context

The user found a React "split-flap board" component online (mechanical departure-board style letter flipping) and wants a loading intro built on it: on page load, a full-screen board flips through a casual greeting, lands on the user's name, then fades away to reveal the real portfolio underneath.

The current site is a single static `index.html` (vanilla HTML/CSS/JS), no build step. An earlier design explored fully migrating the whole site to React + Tailwind so components like this could be copy-pasted verbatim — that was scoped back down (see the superseded migration spec) because it's far more upfront work than this feature needs. This spec instead adds a **minimal React "island"**: Vite + React is introduced only to power this one animated overlay. The rest of the site's markup, CSS, and behavior are untouched.

## Goals

- Full-screen flip-board intro plays on every page load (no skip, no once-per-session logic — user explicitly wants it every time).
- Casual, warm tone, ending on "YOSEF PILIP".
- Multiple different greeting variants; one is picked at random each load, so repeat visits feel fresh.
- Visually matches the existing bio-terminal theme (dark background, lime/amber accents, monospace font) — reuses the CSS custom properties already defined in `index.html`, no new color values invented.
- Respects `prefers-reduced-motion` (the rest of the site already does this sitewide).
- Fades out into the existing static site, which renders normally underneath the whole time.

## Non-goals

- No Tailwind, no conversion of the rest of the site to React.
- No skip button / click-to-dismiss.
- No persistence (localStorage/sessionStorage) to suppress repeat plays.
- No changes to any existing section, nav, or content.

## Architecture

Vite + React + TypeScript is added to the repo purely to bundle this one component. `index.html` keeps its entire existing `<style>` block and body markup as-is. Two additions to `index.html`:

1. `<div id="intro-root"></div>` — first child of `<body>`, before everything else.
2. `<script type="module" src="/src/main.tsx"></script>` — added near the end of `<body>`, after the existing inline `<script>` block.

`src/main.tsx` mounts a single React component into `#intro-root`. Nothing else on the page is touched or controlled by React — the rest of the DOM is the same static HTML that exists today, rendering normally the whole time. The intro is a `position: fixed; inset: 0` overlay with a high `z-index` (above the existing `.grain` overlay and mobile menu) that sits on top of the real page and then fades itself out.

```
portfolio/
  index.html                      # existing file, + 2 lines added (see above)
  vite.config.ts                  # @vitejs/plugin-react, default settings
  tsconfig.json
  package.json
  .gitignore                      # node_modules/, dist/
  src/
    main.tsx                      # mounts <IntroAnimation /> into #intro-root
    data/
      introMessages.ts            # typed pool of greeting variants
      types.ts                    # IntroVariant type
    components/
      IntroAnimation.tsx          # orchestrates: pick variant, step through screens, fade out
      FlipBoard.tsx                # renders grid of FlipCell for the current screen's lines
      FlipCell.tsx                 # single character cell + flip animation
    styles/
      intro.css                   # imported by main.tsx; uses existing :root CSS variables
```

## Content: greeting variants

Each variant is two "screens": a 2-line casual greeting, then the name. Structure:

```ts
type IntroVariant = { screens: string[][] }; // each screen is 1-2 lines

export const INTRO_VARIANTS: IntroVariant[] = [
  { screens: [["HEY THERE.", "WELCOME ABOARD."], ["YOSEF PILIP"]] },
  { screens: [["OH, HI.", "GLAD YOU MADE IT."], ["YOSEF PILIP"]] },
  { screens: [["WELL HELLO.", "COME ON IN."], ["YOSEF PILIP"]] },
  { screens: [["HEY!", "THANKS FOR STOPPING BY."], ["YOSEF PILIP"]] },
  { screens: [["SUP.", "WELCOME TO THE SITE."], ["YOSEF PILIP"]] },
];
```

One variant is chosen at random (`Math.floor(Math.random() * INTRO_VARIANTS.length)`) each time `IntroAnimation` mounts. The user can freely edit/add/remove lines in this file later — it's plain data.

## Board sizing

The board is a fixed 2 rows tall (matches the greeting screen's 2 lines; the name screen just leaves row 2 blank — no layout shift between screens). Column count is computed once from the data: the length of the longest line across every screen in every variant, so the board is a consistent width no matter which variant is randomly chosen. Shorter lines are centered and padded with blank cells.

## Animation sequence

1. On mount, pick a random variant.
2. Render screen 1 (greeting, 2 lines): each cell flips from blank to its target character. Cells animate independently — a few randomized intermediate glyphs per cell (slot-machine "spin then land" effect) with a small per-cell delay (staggered by column, with slight randomness) so the reveal cascades across the board rather than snapping in uniformly, matching the reference screenshot's look. Mid-flip cells are highlighted in `var(--lime)`/`var(--amber)`; settled cells are plain `var(--text)` on `var(--surface)`.
3. Hold screen 1 briefly, then flip to screen 2 (name) using the same per-cell flip animation (unchanged cells that are already correct don't re-flip; row 2 cells flip to blank).
4. Hold screen 2 briefly.
5. Fade the entire `#intro-root` overlay from opaque to transparent (opacity transition), then set it to `display: none` (and stop rendering the component's content) so it no longer intercepts clicks — revealing the real site, which has been there the whole time.

Approximate total duration: ~7 seconds (flip-in + hold per screen, plus the fade). Exact per-step timings are an implementation detail, tunable without changing this design.

**Reduced motion:** if `prefers-reduced-motion: reduce` is set, skip the flip/board animation entirely — the intro overlay never renders (or renders and immediately fades), and the site is visible right away. This matches the existing sitewide reduced-motion handling.

## Styling

`src/styles/intro.css` is plain CSS (no Tailwind), imported by `main.tsx`. It references the CSS custom properties already declared under `:root` in `index.html`'s existing `<style>` block (`--bg-lowest`, `--surface`, `--lime`, `--amber`, `--text`, `--font-mono`, etc.) — custom properties cascade across all stylesheets in a page regardless of which file declares vs. consumes them, so no color values are duplicated. The board itself echoes the reference screenshot: a dark rounded container holding a grid of individual flap-key cells in `--font-mono`.

## Build & deploy

- `npm create vite@latest . -- --template react-ts` scaffolds the project (adjusted to not overwrite the existing `index.html`/README — done by hand rather than letting the scaffold clobber files).
- `npm run dev` for local preview; `npm run build` produces `dist/` with the same static markup plus the bundled intro script/styles injected.
- Vercel: needs to build via `npm run build` and serve `dist/` instead of serving `index.html` directly as a static file. Since the project was previously configured as a zero-build static site, the user should confirm the Vercel project's build settings pick this up (Vercel auto-detects Vite via `vite.config.ts`, but an existing project's dashboard settings may need a one-time check). This is a manual step outside this repo.

## Out of scope / follow-up

- Broader adoption of React/Tailwind for the rest of the site remains a possible future project (see the superseded migration spec) but is not part of this work.
