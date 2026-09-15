# Visual editing panel — dev-only in-page editor

**Date:** 2026-09-15
**Status:** approved design, ready for implementation planning
**Scope:** portfolio only. Generalization to other projects is explicitly deferred (§10).

---

## 1. What this is

A dev-only overlay that makes the running site directly editable: drag an image
into place inside its frame, drop a test photo onto a slot to judge it before
spending money generating one, click a headline and retype it, change a font or
a token colour from a constrained picker.

It runs inside `npm run dev`, on the real page, with real Lenis scroll and real
parallax. It is not a mockup tool and not a canvas — it edits the actual site.

The split it creates: **Claude does structure, layout, new pages, and the scroll
system. Yosef does taste, with a mouse.**

---

## 2. Why — the problem this actually solves

The site has `object-fit: cover` on every image
(`src/styles/base.css:136`, `src/styles/stack.css:19`) and **no
`object-position` anywhere in the codebase**. Every image is hard-locked to
`center center`.

So "move the subject slightly left" has no knob to turn. The observed workaround
has been to re-generate the image — and because the image API has no seed, every
re-roll returns a different picture, which is worse in a new way, which prompts
another roll. Hours and real money have gone into that loop.

**Framing is a CSS value. It must never cost an image generation.** That single
sentence is the reason this tool exists; everything else here is adjacent value.

### Why not Framer / Webflow

They solve this for people who do not have code. This repo already has the
expensive part — a custom `--p` scroll system, a real token system, four working
rooms, 23 test files guarding them. Adopting Framer would mean rebuilding all of
it inside someone else's editor and abandoning the parallax that is the site's
signature. What is missing is only the thin visual layer on top, and that layer
is cheap to build precisely *because* the code underneath is already ours.

A hand-built panel also does something Framer categorically cannot: it knows the
design system, and can refuse to produce a state the guards would reject (§5.4).

---

## 3. Scope

**In, v1:**

- Image framing — position and zoom, per slot
- Drag-and-drop local test images — preview only
- Text content editing on opted-in elements
- Font family, type step, and colour — constrained to existing tokens
- Explicit Save; nothing is written until pressed

**Out, v1** (each deferred deliberately, not forgotten):

- Parallax `--rate` sliders. Rates are per-class with separate mobile overrides
  at `src/styles/stack.css:139-146`, and are guarded by
  `tests/stack-depth.test.ts`. Editing them needs a breakpoint model that v1
  does not have, and the rates are already tuned.
- Section resizing of any kind. Free-form drag-resize that writes arbitrary CSS
  fights the token system and breaks responsive silently.
- Saving a dropped test image into the repo (§5.2).
- Any use in another project (§10).

---

## 4. Architecture

### 4.1 Activation and the dev-only guarantee

The panel is imported behind `import.meta.env.DEV` in each page entry. Vite
statically replaces that expression at build time, so the entire module —
UI, listeners, save client — is dead code in `npm run build` and is dropped.
**The production bundle cannot contain the panel.** This is the primary answer
to "can this break the live site": it is not present on it.

Activated with `Ctrl+Shift+E`. While active a fixed badge reads `EDIT` so the
mode is never ambiguous, and an unsaved-changes count sits next to it.

The write endpoint is registered through a Vite plugin's `configureServer` hook,
which only runs in dev. There is no production code path that writes files
because there is no production server.

### 4.2 Two independent write paths

| Path | Target | Carries |
|---|---|---|
| 1 | `src/styles/layout.generated.css` | image framing, font, size, colour |
| 2 | the page's `.html` file | text content only |

**They share no code.** A defect in the HTML patcher cannot corrupt image
values; a defect in the CSS generator cannot touch markup. This separation is
the main structural safety property of the design, and it is why typography and
colour deliberately live in path 1 rather than as inline styles — it keeps
path 2 as narrow as possible.

### 4.3 Slot identity — already solved

Every `<figure class="frame">` already carries a unique human-readable
`data-label` (`"Hero L1 — jungle-far"`, `"Thesis — server-moss"`, `"Life —
life-decks"`). That is a stable per-slot key that exists today.

**The image half of the panel requires no new markup.** Generated rules key on
it directly.

### 4.4 Editable text identity

Text has no equivalent existing key, so editable blocks opt in with
`data-edit="<id>"`, added by hand once. The panel will only ever touch elements
carrying that attribute.

This is a feature rather than a limitation: the blast radius is exactly what was
opted into, and which text is editable is visible in the source. The initial
pass covers Home's prose; other pages become editable by adding attributes, with
no code change.

**Rejected alternative:** a dev-only Vite transform stamping
`data-src-loc="index.html:76:12"` on every element, making everything editable
with no markup changes. More powerful and closer to the Framer feel, but its
failure mode is writing to the wrong byte range in a real source file. Revisit
once the tool has earned trust.

**Rejected alternative:** moving copy into a content JSON and rendering pages
from it. This would cost the hand-authored editorial HTML that the site's whole
premise rests on.

---

## 5. The knobs

### 5.1 Image framing

Drag the image inside its frame to pan; wheel over it to zoom. `.frame` already
sets `overflow: hidden` (`src/styles/base.css:130`), so no structural change is
needed.

- Pan writes `object-position: <x>% <y>%`
- Zoom writes `--img-zoom`, applied as `transform: scale(var(--img-zoom, 1))`

Values clamp so the frame can never reveal empty space: zoom has a floor of 1,
and pan is bounded by the overflow the current zoom actually produces.

### 5.2 Test images

Dragging a local `.jpg`/`.png`/`.webp` from the desktop onto any slot swaps it
for a blob URL immediately. This is **preview only** — it is never written to
the repo, and a reload restores the real image.

That is the correct scope, because the stated need is *judging composition
before generating*. Making it permanent would add a third write path (copying
bytes into `assets/img/` plus rewriting a `src` in HTML) for a use case that
preview already serves.

Framing values are keyed to the slot, not the image, so anything dialled in
against a test photo carries over to the real one.

### 5.3 Text content

`contenteditable` on `[data-edit]` elements — native browser behaviour, no
library.

Save patches the HTML with `parse5`, already present at 8.0.1 via `jsdom` and
promoted to an explicit `devDependency` since it is now imported directly.
Parsing with `sourceCodeLocationInfo: true` yields, for each element, the exact
offsets of its inner range; the patch replaces that range and nothing else.

**v1 supports plain-text elements only** — an element containing nested markup
is not offered as editable. New text is HTML-escaped (`&`, `<`, `>`) before
writing.

### 5.4 Typography and colour — token-constrained by design

| Control | Offers | Writes |
|---|---|---|
| Font | display / body / mono | `font-family: var(--font-*)` |
| Size | the 7 steps, `--step-wordmark` → `--step-meta` | `font-size: var(--step-*)` |
| Colour | `--fg`, `--fg-dim`, `--muted`, `--accent`, `--accent-2` | `color: var(--*)` |

**No hex picker and no pixel slider, deliberately.** `src/styles/tokens.css`
declares itself the only file permitted to contain colour literals, and
`tests/tokens.test.ts` enforces it. A free colour picker would write hex into a
stylesheet and fail the project's own suite. Emitting token references keeps
that invariant true by construction.

Two live guards run before a value can be committed, so an invalid state cannot
reach Save:

- the ≥32px negative-tracking rule
- the contrast rule from `tests/contrast.test.ts`

Green remains absent from UI chrome: `--accent-2` is offered because it is the
per-room accent the design system already sanctions, and the swatch list is
drawn from the tokens actually in scope for the current `[data-room]`.

---

## 6. Data format

### 6.1 `src/styles/layout.generated.css`

Committed, not gitignored — it carries real design decisions. Ships with a
header comment and no rules so the `@import` never 404s.

```css
/* GENERATED by the visual editing panel. Safe to delete or git-checkout
   wholesale; every rule here is a framing or token choice, never structure. */

.frame[data-label="Hero L1 — jungle-far"] img {
  object-position: 42% 61%;
  --img-zoom: 1.12;
}

[data-edit="hero.intro"] {
  font-family: var(--font-body);
  font-size: var(--step-lede);
  color: var(--fg-dim);
}
```

Selectors are written at `.frame[data-label="…"] img` — specificity (0,2,1),
which beats `.frame img` at (0,1,1) **regardless of import order**. Cascade
correctness does not depend on where the import lands.

Imported as the last `@import` in each page's entry stylesheet (`home.css`,
`projects.css`, `music.css`, `workshop.css`, `case-study.css`). `@import` must
precede other rules, so it goes in the existing import block, not at the file's
end — the specificity choice above is what makes that safe.

**Guarded for free:** `tests/stylesheets.ts` enumerates `src/styles/*.css` from
the directory rather than a hardcoded list, so the generated file is swept by
every existing stylesheet guard the moment it exists. The panel's output is
policed by the same rules as hand-written CSS, automatically.

### 6.2 Unsaved state

Held in memory and mirrored to `localStorage`, so an HMR reload mid-session does
not lose work. Cleared on Save.

---

## 7. Safety and failure modes

| Risk | Mitigation |
|---|---|
| Panel reaches production | Impossible — `import.meta.env.DEV` is stripped at build |
| Text patch writes to the wrong place | Before writing, the file is re-read and the current inner text compared to what the panel loaded. Any mismatch aborts the whole save and asks for a reload |
| Endpoint writes outside the project | Targets are validated against an allowlist: `src/styles/layout.generated.css` and the known page HTML files. Anything else is rejected |
| A bad value ships | It is a normal git diff; `git checkout` reverts. The gate is `npm test && npx tsc -b --noEmit && npm run lint && npm run build` as always |
| Generated CSS violates design rules | Auto-swept by existing guards (§6.1), plus live pre-Save validation (§5.4) |
| Accidental edits | Nothing writes without an explicit Save; the badge shows a pending count |

Save is atomic per request: all patches for a file are validated first, and any
failure aborts every write in that request rather than leaving half applied.

---

## 8. Testing

New `tests/panel.test.ts`, covering pure logic with no browser:

- CSS generator emits expected rules for a given state
- **generator never emits a raw colour literal** — the guard that keeps §5.4 honest
- HTML patcher replaces only the targeted inner range, leaves the rest byte-identical
- patcher escapes `&`, `<`, `>`
- patcher aborts on a stale-text mismatch and writes nothing
- patcher refuses an element containing nested markup
- path allowlist rejects traversal
- pan/zoom clamping never produces a framing that exposes empty space

The 23 existing test files run unchanged. The empty `layout.generated.css` is
landed early, on its own, to confirm no existing sweep trips on a generated
file before any panel code is written.

---

## 9. Success criteria

1. Reframing an image takes seconds with a mouse and costs zero generations.
2. A desktop photo can be dropped onto a slot and judged in the real parallax
   before any spend.
3. Copy can be rewritten on the page and saved into the real HTML.
4. `npm run build` output is byte-identical to a build with the panel code
   deleted.
5. All four gate commands stay green.

---

## 10. Later — generalization

Packaging is deferred until the tool has been used on real work, so that what
gets packaged is what turned out to matter.

The intended end state is a **Claude skill** as the distribution mechanism:
`SKILL.md` plus the panel source, so adding it to another project is "add the
visual editor" and writing that project's manifest. Everything project-specific
is already funnelled through one manifest module, making the extraction
mechanical rather than a rewrite.

**Not an MCP connector.** MCP exposes tools to Claude; this panel exists so
Yosef can change things *without* going through Claude. Reading back what
changed is just reading a file.

Cache It is React + FastAPI and will need adapter work regardless of how clean
the seam is. That is a separate design.
