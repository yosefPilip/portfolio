# DJ Coverflow Carousel — Design

Date: 2026-07-16
Project: personal/portfolio — DJ & Music page (`music.html`)

## Goal

Replace the flat `.reel` of mix covers on the Music page with an interactive
3D coverflow carousel: the selected cover is large and centered, neighbors
scale/rotate/fade with depth, arrows and swipe/keyboard navigate, and each
cover surfaces its title, a short description, and a SoundCloud link.

## Approach

React island (consistent with the intro animation), data-driven. Both
`site.ts` and `main.tsx` load on every page; React islands mount by element
id, so we add a `#coverflow-root` div to `music.html` and mount into it.

## Files

- `src/data/tracks.ts` — `Track[]` = `{ id, title, description, cover, href }`,
  seeded with the 4 existing mixes and short one-line descriptions.
- `src/components/Coverflow.tsx` — the island.
- `src/styles/coverflow.css` — styles using existing tokens (`--lime`,
  `--font-mono`, `--card-border`, glass, etc.).
- `src/main.tsx` — conditional mount into `#coverflow-root`.
- `music.html` — replace `.reel` block with `#coverflow-root`; add
  `main.tsx` script tag.

## Layout & motion

- Horizontal 3D coverflow. Selected cover: large, centered, facing viewer.
- Neighbors: scaled down, rotated in perspective (angled away), offset
  sideways, dimmed. Depth increases with distance from center (smaller,
  fainter, further back). Driven by CSS `transform` + `opacity` transitions.
- Selection stays centered; covers slide/resize around the fixed center on
  every change.

## Interaction

- Arrows (left/right) flanking the stage step through selection.
- Click a side cover → animates to center (selects). Click centered cover →
  opens its SoundCloud link in a new tab.
- Keyboard ←/→ navigate when the carousel region is focused.
- Swipe left/right on touch.
- Info panel below the center cover: title, description, "Listen on
  SoundCloud →" link (explicit, discoverable link).
- Mono position indicator (`02 / 04`).
- Ends clamp (arrows disable at first/last — no wrap).
- Respects `prefers-reduced-motion` (fade fallback, no large transforms).

## Scope

Replaces only the Mixes reel. Overview and Connect sections unchanged.
Adding a mix later = one entry in `tracks.ts`.
