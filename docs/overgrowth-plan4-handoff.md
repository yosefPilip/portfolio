# Overgrowth — handoff into Plan 4: images, the cottage, and colour

**Written 2026-09-14, after Plan 3 shipped.** Everything in §1 comes from the owner
directly, in his own words. §2 is a bug I measured in a browser while writing this.
§3 is the image strategy he asked for. Read §1 and §2 before planning anything.

Plan 3's ledger: `.superpowers/sdd/2026-09-11-overgrowth-3-music-and-workshop/progress.md`

---

## 1. Owner feedback, 2026-09-14

### 1.1 How to work with him — READ THIS FIRST, it is about process not code

> "You keep really hearing things and just sticking to them and not being able to change.
> I don't care about the NFC DNA tag or whatever. Doesn't matter to me. There's certain
> details that you're very stuck up on, and that's not something that I'm worried about.
> I'm just trying to create the design and the layout of everything."

**What this means in practice:**

- A detail he mentioned once is not a permanent constraint. Do not carry it forward into
  every later decision as though it were load-bearing. Ask, or drop it.
- He is working on **design and layout**. Copy precision is not the axis he is optimising
  right now, and treating it as a blocker slows him down.
- Specifically released: the `NTAG 424 DNA` / NFC framing on the Cache It row. He does not
  care. Do not defend it, do not re-litigate it, do not treat it as a fact that must be
  preserved. Change it freely or leave it — his indifference is the ruling.

> "I'm gonna go back and try to rewrite things in my own kinda way because I don't want
> everything to be AI generated. A lot of the things I wanna write myself."

**Consequence for all future work:** site copy is **his**, not ours. Write placeholder copy
that is structurally correct and honest, then get out of the way. Do not polish prose, do
not defend word choices, and do not build tests that pin exact sentences — a test that
asserts a specific sentence will fight him the moment he rewrites it.

**Action:** review the copy-drift guard in `tests/projects-page.test.ts`. It compares
`projects.html` cell-by-cell against `src/data/projects.ts`. That is a *consistency* check
between two files he would edit together, which is fine — but confirm nothing else in the
suite pins exact prose. Anything that does should assert structure, not wording.

### 1.2 DJ Music Sorter — do not advertise downloading. **DONE 2026-09-14.**

> "I don't want my music downloader to say that I'm downloading or stripping music because
> that's not something I wanna show off. I kinda want it to just be more focused on the
> sorting aspect of existing music on your folders or music you just downloaded, not
> downloading music from the app."

Fixed immediately rather than deferred, since it concerned something he did not want
published. Commit `2ea7b13`. The Discover/download module is gone from the description; the
row now describes the Sorting Deck and Set Builder working over a library already on disk.
The `spotipy` / `scdl` / `yt-dlp` tooling is named nowhere on the site.

**Standing rule for this project:** nothing on the site describes acquiring music. If a
future task pulls from the dj-tool design doc again, Module 3 is off-limits as source material.

### 1.3 The Music page needs more colour

> "The DJ music just doesn't have enough color. You pick the color for each page, but all
> the text is all white, and there's only about a word or a single box of color. And I wish
> that there was just a little tiny bit more color in some of the words, but I know the
> images will add that."

Correct diagnosis. Every room sets `--accent-2` in `tokens.css` (music is orchid `#b97fc9`),
but almost nothing uses it — body text is all `--fg` bone.

**This needs a spec amendment, because the current rule blocks the fix.** Spec §15 says
"≤2 visible uses of each colour per screen." That guideline should apply to **clay**
(`--accent`), which is the load-bearing "this is clickable" signal and must stay rare. It
should **not** apply to `--accent-2`, which is the room's identity colour and is currently
being rationed for no reason. Amend §15 to scope the count rule to clay only.

Candidate places to spend orchid on Music (a planning session should pick two or three, not
all of them — he asked for "a little tiny bit more", not a repaint):

- `.spec` `<dt>` labels (Alias / Sound / Also) — currently `--muted`.
- The `#mixes` meta line above the coverflow.
- A key phrase inside the lede, wrapped in a span.
- `.cf-index` already uses `--accent-2` — check it is actually visible.
- Section top-borders / hairlines, tinted rather than neutral.

Apply the same review to Workshop (ochre) and Projects (slate) once the approach is settled
on Music. **Do not touch clay.** It stays on clickable things only — that rule is working
and Plan 3 verified zero violations across all five pages.

### 1.4 Workshop becomes a cottage in a landscape

> "Instead of doing a workshop, kinda have a little cottage or something in some nature
> place, maybe some plains, or I'm not sure — we can think of something, because I still
> wanted to be stuck with the theme of nature. And once you go inside the little cottage,
> you see everything set up: a little workshop."

This supersedes spec §8.4's "the workbench" hero. The page content — the `RE—` acts, the
manufacturing section, the Resell Assistant link, the real before/after photographs — all
stays. **Only the hero and its framing change.**

**Why it is a better idea than what shipped:** the current Workshop hero is an interior
workbench, which is the one room on the site with no landscape in it — it breaks the
"Overgrowth" concept the other three rooms share. A cottage in a clearing keeps the nature
theme and earns the interior by making you arrive at it.

**Proposed structure** (a planning session should develop this, not treat it as settled):

- **Hero stack = the exterior.** Three layers: distant treeline or plains behind, the
  cottage in the middle ground, tall grass in the foreground. Scrolling is the approach.
- **The one warm light in a cold palette is the window.** Everything else on this site is
  overcast and desaturated; a lit cottage window is the only warm source, and it is what
  makes "go inside" legible without a single word of instruction. This also resolves where
  spec §12's "the lock bends warm here" belongs — it bends in the window, not the whole frame.
- **Second stack = the interior**, immediately after. The existing `bench-far` / `bench-near`
  workbench scene becomes this, so the shots already specced are not wasted — they move
  rather than being discarded.
- Then the `RE—` acts run as they do now, now read as happening inside.

**Open question for him:** plains/grassland, or a forest clearing? He said "maybe some
plains, or I'm not sure." Ask before generating anything — this decides three images.

### 1.5 On the whole

> "So far, the website looks really good. I like the layout."

Layout and structure are settled. Plan 4 is images, colour and the cottage — not another
structural pass.

---

## 2. MEASURED BUG — the image frames are misaligned, and images will NOT fix it

> "For all the photos, I don't know if this is an issue, but I see the dashed line where
> the images will go. It's still not centered. I don't know if making images will put them
> in the center or not."

**He is right, it is a real bug, and generating images will not fix it.** I measured it in a
browser before writing this. **Fix this before spending a cent on generation** — every
dimension decision depends on it.

### Root cause

Full-bleed hero markup is:

```html
<figure class="frame" style="--ar: 3 / 2; height: 100%;" data-label="…">
```

`.frame` (`base.css:125`) carries `aspect-ratio: var(--ar, 3/2)`. With an inline
`height: 100%` **and** an aspect ratio, the browser derives **width = height × ratio** — so
the frame's width is set by the plate's *height*, never by the plate's width. It has
`margin: 0` from the reset, so it is **anchored left**, not centred.

`.plate` is `position: absolute; inset: -12% -3%` — it is ~124% of viewport height and ~106%
of viewport width. Its aspect ratio therefore changes with every viewport. The frame's does
not. They agree only by coincidence.

### The numbers (measured, `npm run dev`, Chromium)

| Page / stack | Viewport | Plate width | Frame width | Result |
|---|---|---|---|---|
| `/music.html` hero, `--ar: 3/2` | 1440×900 | 1511px | 1674px | **overflows 164px right**, crops asymmetrically |
| `/music.html` hero, `--ar: 3/2` | 1920×1080 | 2019px | 2009px | **11px short** — a visible background band |
| `/` `#thesis`, `--ar: 4/5` | 1920×1080 | 2019px | 1071px | **948px of bare plate** — image occupies half the width, jammed left |

That last row is what he is seeing. A portrait `--ar` inside a landscape plate leaves nearly
half the plate empty, with the placeholder hugging the left edge.

It also explains his earlier complaint from Plan 3 (§2.5 of the previous handoff): *"not
filling up the whole screen when I'm on my monitor nor when I'm on my desktop or laptop."*
Same bug, both symptoms.

### The fix

A frame that IS the plate background should not be an aspect-ratio box at all. The plate
already defines the box; `object-fit: cover` on the `<img>` already does the fitting.

```css
/* A frame used as a full-bleed plate background fills the plate.
   --ar belongs to inline content frames, not to backgrounds. */
.plate > .frame { width: 100%; height: 100%; aspect-ratio: auto; }
```

Then drop the inline `style="--ar: …; height: 100%"` from the hero figures, or keep `--ar`
purely as documentation of the source image's shape.

**Do not** fix this by centring the frame — centring a 1071px box in a 2019px plate still
leaves 948px of empty plate. It has to *fill*.

**Verify after fixing**, at 1440×900, 1920×1080 and 390×844: frame width === plate width and
frame height === plate height on every `.plate > .frame`, on all five pages. Both symptoms
(overflow and short-fall) must be zero.

### Consequence for generation

Once fixed, every full-bleed image is cropped by `object-fit: cover` against a plate whose
ratio ranges roughly **1.35:1 to 1.55:1 on desktop** and goes **portrait (~0.5:1) on phones**.
So:

- Generate wide (3:2), high resolution.
- **Compose every subject inside a centred square safe area.** Anything outside it is gone on
  a phone. This single rule prevents most wasted renders.
- Remember the plate overscans by `-12%` vertically and `-3%` horizontally for parallax
  travel — the outer ~12% top and bottom is crop margin, never guaranteed visible.

---

## 3. The image plan — what he explicitly asked for

> "I know the next plan will involve images, and I really need good concrete instructions
> and planning for the images so I don't waste a lot of money and time making images that
> don't work. I need good layered images. That means making good images that go well with
> each other and some that have no background and that are perfectly cut out with no pixels
> that are messed up so that they can cleanly be put over each other and move around during
> the scroll landing animation."
>
> "I just need extra extra care about the images and doing everything we can to make sure
> that they turn out well."

### 3.1 The hard truth about "perfectly cut out with no messed up pixels"

Alpha cutouts from image models **halo**. They fail worst on exactly the subjects this site
needs in front — leaves, fronds, grass, branches, mist — because those have thousands of
thin, semi-transparent edges. Background-removal tools leave a bright or dark fringe that
reads as a sticker pasted on the page. This is the single most likely way to waste money here.

**This project already learned that lesson and wrote it down.** Spec §7, on the hero's front
trunks:

> "Alpha cutouts from image models halo; out-of-focus trunks in fog are just blurred vertical
> bars, so CSS does it better."

That precedent is the strategy. Ranked, most reliable first:

**Tier 1 — don't generate it at all.** Fog, haze, vignettes, light shafts, rain, blurred
out-of-focus trunks and grass blades: CSS gradients and shapes beat generated alpha every
time, cost nothing, scale perfectly, and never halo. The hero's seven front trunks already
work this way. Extend it before reaching for an image.

**Tier 2 — blend modes instead of alpha. This is the technique to use for layered plates.**
Ship an **opaque** image with a flat background and let CSS remove the background
arithmetically. No cutout step, no matting, no fringe — soft and wispy edges composite
*perfectly* because nothing is ever decided to be "in" or "out".

- **Dark element in front** (fronds, branches, grass, silhouettes): generate on **pure white**,
  ship opaque, composite with `mix-blend-mode: multiply`. White becomes invisible; darks stay.
- **Light element in front** (mist, god rays, dust, backlit leaf edges): generate on **pure
  black**, ship opaque, composite with `mix-blend-mode: screen`. Black becomes invisible;
  brights stay.

**Critical implementation gotcha — this will cost an afternoon if missed.** `mix-blend-mode`
blends an element with its backdrop *within the nearest stacking context*. `.plate` sets
`will-change: transform` (`stack.css:16`), which creates a stacking context — so a blend mode
applied to a `.frame` **inside** a plate blends only against that plate, i.e. does nothing
useful. **Apply the blend mode to the `.plate` itself**, and confirm no ancestor sets
`isolation: isolate`. Prove it on one layer before generating a set.

**Tier 3 — true alpha.** Only for hard-edged opaque objects with clean silhouettes. Expect to
pay for retries. Use last, not first.

### 3.2 Making the set look like one shoot

Generate a **single reference image first**, get his approval on it, and use it as the style
anchor for everything else. Then hold these constant across every prompt:

- One focal length (35mm), one aperture feel, one light direction — name the side and never
  change it.
- One time of day and weather (overcast), one grade (deep desaturated greens, wet black).
- Underexposed with detail retained in shadow; visible film grain.
- Negative list on every prompt: neon, glowing, cyberpunk, lens flare, HDR, oversaturated,
  vaporwave, text, watermark, logo, CGI render, plastic sheen.

**Judge layers composited, never alone.** The existing spec already says this for one pair
("judge `canopy-far` behind `trees-back`, never on its own") — make it the rule for all of
them. A back plate that looks beautiful alone is usually too busy to sit behind type.

### 3.3 What each layer role actually needs

Layers are not interchangeable, and prompting them the same way is why sets fail to stack:

- **Back plate** (moves least, sits behind the wordmark): **no subject at all.** Low contrast,
  soft, quiet in the centre third. Anything that competes for attention fights the type.
- **Mid plate**: the subject. This is the only layer allowed to be interesting.
- **Front plate**: **sparse and mostly empty.** Enters from one edge only, occupies well under
  half the frame, with the rest flat background for the blend to erase. Note
  `stack.css:32` already assumes this — `.plate--front .frame.is-missing { opacity: 0.25 }`
  exists precisely because "the real image is a sparse alpha overlay."

### 3.4 Spend protocol — the money-saving part

1. **Fix §2's geometry bug first.** Every dimension below is wrong until it lands.
2. **Prove the blend-mode pipeline on ONE throwaway image** before generating anything real.
   Confirm the front layer composites with no fringe at 1440×900 and on a phone width.
3. **One cheap test render per layer role** — one back, one mid, one front — composited
   together at real slot sizes. **Show him the composite.** Approve the *look* before
   generating the *set*.
4. Only then generate finals, **in the order the old Plan 3 Task 5 lists** — it is ordered
   cheapest-decision-first, and two of its steps say explicitly to stop and judge.
5. **Never batch all sixteen.** If one image lands wrong, regenerate that one; do not adjust
   the other fifteen to match a mistake.
6. WebP at ~q72, never ship the raw PNG. Report dimensions and byte size per file — a 4MB
   hero is a defect even if it looks right.

### 3.5 The slot list has changed

Plan 3's Task 5 brief, with its per-image prompts and dimensions, is still valid and is
preserved at
`.superpowers/sdd/2026-09-11-overgrowth-3-music-and-workshop/task-5-brief.md`.
**Two changes to it:**

- The Workshop pair (`bench-far`, `bench-near`) moves from the hero to the *interior* stack,
  and **new cottage exterior images are added** — roughly `cottage-far` (treeline or plains),
  `cottage-mid` (the cottage, lit window), `grass-near` (foreground, front-plate rules from
  §3.3). Settle §1.4's plains-vs-clearing question first.
- Re-examine every slot against §3.1: several probably want to be Tier 1 (CSS) or Tier 2
  (blend mode) rather than the alpha cutout the old brief assumed. `fronds-near` is the
  obvious case — its brief already hedges, "needs real alpha or a pure black background."

### 3.6 Untouchable

`assets/img/workshop/` holds nine photographs the owner took of two real pieces of furniture
he refurbished. **Never generate, replace, re-export, or colour-grade them**, and never grade
them toward the site palette — a real garage should look like a real garage. A generated image
presented as a real refurbished piece is a fabricated portfolio item and fails the definition
of done. Plan 3 verified their file timestamps predate the session to prove no agent touched them.

---

## 4. Carried forward from Plan 3

Two decisions he has not made yet, both parked deliberately:

- **Overlay body position.** Inside the case-study overlay `.cs-body` sits at x=361.59 beside
  the restored rail — parity with the standalone page, not centred in the viewport. Centring
  it would move both contexts, since `margin-inline: 0` is shared. Needs his call.
- **The case-study rail is desktop-only**, hidden below 1100px on both the overlay and the
  standalone page. So "a side bar that can take you to other products" does not exist on a
  phone. Widening it is a design decision, not a bug fix.

Smaller items, none blocking:

- `coverflow.css`'s `.cf-cover` transition list still names `box-shadow` after both glows were
  removed. Dead weight.
- The Depop link carries a trailing `↗` no other external link on the site uses.
- Clay counts run above spec §15's "≤2 per screen" on Projects (10) and Music (6). Every
  instance is genuinely clickable. See §1.3 — the count rule needs rescoping anyway.
- `wght@300` is loaded by every page's font link and never used.
- `portfolio.live` points at the GitHub profile rather than the repo.
- Spec §10 item 8 ("Screens grid") was dropped from the Cache It case study for want of
  images. Revisit once they exist.
- **Not yet deployed.** The gate is clear and the site builds, but nobody has run a Vercel
  deploy. After the first one, confirm `yosefpilip.com/projects/cache-it` loads directly —
  that path depends on `cleanUrls` and cannot be verified locally.
