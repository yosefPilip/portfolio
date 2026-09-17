# Hero rooms — motion and images

Date: 2026-09-17
Supersedes: sittings 3–6 of `docs/image-rooms-queue.md` (Projects, Music, Workshop
exterior, Workshop interior). Sittings 2 and 7 (Home's rest, Cache It) are untouched
and stay unplanned by design.

---

## 1. What this is

Home's hero shipped three images against six layers and proved the pipeline. The other
three rooms still render dashed placeholders over three flat layers, and the owner has
now dropped a hand-picked reference into each slot using the visual editing panel.

This spec covers both halves of finishing them, because they are not separable: an
image's composition is determined by the layer it is cut for, and a layer's rate is only
judgeable against a real image. Each room is built as one vertical slice — layers, then
images, then ledger, then commit — in the order **Projects → Music → Home → Workshop**.

Projects goes first because it exercises every new mechanism at the lowest cost and its
two references are the clearest. Workshop goes last because its doorway dolly is the one
genuinely new piece of motion on the site and should inherit whatever the first three
rooms teach.

---

## 2. Scope

**In.** Nine image slots and the layer work each needs:

| Room | Slot | Tier | Reference on disk today |
|---|---|---|---|
| Home | `undergrowth-low` | 2 white→multiply | none — described in conversation |
| Projects | `ridge-far` | 1 opaque, **final** | `assets/img/images.jpg` |
| Projects | `ridge-near` | 2 white→multiply | `assets/img/snow-mountain-…-transparent.png` |
| Music | `cave-far` | 1 opaque, **final** | `assets/img/purple-crystals-…-glowin.webp` |
| Music | `cave-near` | 2 white→multiply | none — described in conversation |
| Workshop | `cottage-face` | 2 white→multiply | `assets/img/images-2.jpg` |
| Workshop | `cottage-door` | 2 white→multiply | none — derived from `cottage-face` |
| Workshop | `shop-interior` | 1 opaque, **final** | none — described in conversation |
| Workshop | `needles-near` | 2 white→multiply | none — settled direction |

Plus Projects' drifting haze, which is CSS and costs nothing.

**Out.** `roots-overlay`, `life-build`, `life-decks`, `life-rack`, `cacheit-street`,
`cacheit-scan`. Also out: the nine photographs in `assets/img/workshop/`, which are the
owner's own and are never generated, replaced, re-exported or graded.

**The reference files are temporary and must not ship.** All four are untracked
third-party stock images sitting in `assets/img/` under their download filenames, and
two carry visible watermarks. Each one is deleted in the same commit that lands the
generated image replacing it, and the `<img src>` in the page goes back to the real
slot path. **No commit in this plan may leave a watermarked stock file referenced by a
page** — a build shipping `purple-crystals-…-glowin.webp` would publish someone else's
watermarked asset on the owner's site.

**Deleted from the queue.** `bench-far` and `bench-near` are cancelled. See §4.4.

**The four references are references, not targets.** Every one of them carries a stock
watermark, a low resolution, or a stock-library colour grade. The generated image
reproduces the reference's *composition* and rejects its *rendering* — the fidelity rule
the owner chose. §3 is how that gets enforced rather than hoped for.

---

## 3. The reference protocol

Every slot brief in the implementation plan carries these four items, and the first two
are mandatory reading before a prompt is written. A brief without them is not ready to
dispatch.

**1. Read the reference off disk.** Open the actual image file. Write down what is
load-bearing — composition, silhouette, light direction, how many depth planes there are,
where the horizon sits — separately from what is incidental: the watermark, the JPEG
artefacts, the stock grade, the 547px width. The prompt is written from the first list
and must not inherit anything from the second.

**2. Look at it in the page.** `npm run filmstrip -- http://localhost:5174/<page> "<stack selector>"`.
The prompt is written against how the reference behaves while scrolling — what the travel
exposes at the bottom, what the title collides with — not against how the file looks
standing still.

**3. A keep/kill list, explicit and per slot.** Written out in the brief. §4 carries the
first draft of each.

**4. The owner's words, quoted verbatim.** Not paraphrased. His sentences about each room
are reproduced in §4 inside quotes and are copied into the brief unchanged.

---

## 4. The rooms

### 4.0 Shared layer rules

Unchanged from the Home hero and still binding:

- **One opaque plate per stack.** Everything above it ships opaque on pure white and
  composites with `mix-blend-mode: multiply`. No alpha, no cutouts, no `screen`.
- **The blend goes on the `.plate`, never the `.frame`.** `.plate` sets
  `will-change: transform`, which creates a stacking context; a blend on a child
  composites only against its own plate and does nothing.
- **A multiply plate's frame must be `background: transparent`,** or the frame's
  `--bg-deep` fill crushes everything behind it to black.
- **Depth is encoded in plate names,** and nearer layers always carry a larger `|--rate|`.
- **Mobile safe band.** At 390×844 only the centre 37.5%–62.5% of a 3:2 source survives.

One rule is added:

- **Structural CSS lives in the page stylesheet; framing lives in
  `layout.generated.css`.** The panel currently has `background: transparent` and band
  trims for `ridge-near`, `cave-near` and `cottage-far` sitting in the generated file.
  That file is rewritten wholesale on every Save, so anything the layer *depends on* to
  render correctly must be moved into `projects.css` / `music.css` / `workshop.css`.
  `object-position`, `--img-zoom` and per-slot band trims stay generated.

### 4.1 Projects — the ridge

> "the project title should go BEHIND the mountain as it scrolls, with some constant
> rolling fog or snowy haze across the screen"

Four plates. Title-behind-mountain needs no new structure — `--copy` is already beneath
`--front`; what is missing is the blend and an image actually shot on white.

| z | plate | `--rate` desktop | `--rate` ≤744px | content |
|---|---|---|---|---|
| 1 | `--back` | −90 | −54 | `ridge-far`, opaque |
| 2 | `--haze` | −160 | −96 | **new**, CSS, drifting |
| 3 | `--copy` | −260 | −150 | `<h1>Projects</h1>` |
| 4 | `--front` | −430 | −250 | `ridge-near`, multiply |

`--stack-h` stays 180vh.

**`ridge-far`** — Tier 1 opaque, 1536×1024, final after explore.
*Keep from the reference:* the layered ridge recession, four or five planes deep, each
plane lighter than the one in front; the fog bank cutting horizontally across the middle
distance and swallowing the base of the peaks; the dark spruce treeline reading as a
serrated edge below the fog.
*Kill:* the Adobe watermark; the 547×365 resolution; the flat stock blue; the pure-white
sky, which must come down into the room's `--bg-deep` range so bone type stays readable.
*Room:* Projects, accent `#7f9bbd` slate. Cold, overcast, 35mm, film grain. No sun.

**`ridge-near`** — Tier 2 white→multiply, 1536×1024, explore tier.
*Keep:* the single foreground peak's silhouette, symmetrical, rising from the bottom
edge.
*Kill:* everything else. This is a silhouette, not a photograph of a mountain — dark
rock and snow-shadow on a **pure white** ground, corner RGB 255. The reference's own snow
highlights are near-white and will vanish under multiply, so the prompt must ask for the
peak read as *dark rock with snow in shadow*, not a sunlit white peak.
*Gate:* `checkplate.py`, corner RGB pure white, centre-band coverage ≤25%.
*Composition:* the summit sits inside 37.5%–62.5% of width, and the title crosses it
mid-runway, so the peak's upper third is where the occlusion happens.

**The haze.** CSS, no image. A `::after` on `.plate--haze`, 200% wide, carrying two
identical copies of a soft horizontal fog gradient, translated by exactly 50% of its own
width over the loop so the seam never lands on screen.

```css
.page-hero .plate--haze::after {
  content: '';
  position: absolute;
  inset: 0 -50% calc(var(--rate, 0) * 1px) -50%;
  animation: haze-drift 48s linear infinite;
}
@keyframes haze-drift {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}
```

Transform-only, so it passes the animation guard. It goes on the `::after` and not the
plate, because the plate's own `transform` is the parallax and the two would fight. Same
structural reason Home's `.plate--fog::after` exists. The `calc(var(--rate) * 1px)` bottom
inset is the painted-surface compensation `plate-coverage.test.ts` requires.

### 4.2 Music — the cave

> "the cave one should have a darker wet cave with purple little crustatls shining like
> ligts, upon scroll name disapears behind cave rock"
>
> "I would say both, more ottom though. have stalagties, stalagmitesa and bouldrs, with
> some visible glowing crystals, small"

Three plates, no haze.

| z | plate | `--rate` desktop | `--rate` ≤744px | content |
|---|---|---|---|---|
| 1 | `--back` | −90 | −54 | `cave-far`, opaque |
| 2 | `--copy` | −260 | −150 | `<h1>Recursion</h1>` |
| 3 | `--front` | −430 | −250 | `cave-near`, multiply |

**Ruling: all light lives in `cave-far`.** Multiply can only darken — that is the exact
property that lets it remove white without a matte. Crystals on the near plate therefore
cannot emit, and the owner's decision is that the glow belongs in the back plate rather
than buying a `screen`-blended glint layer. `cave-near`'s crystals read as *shape* —
faceted silhouettes in the rock — and the light behind them comes from `cave-far`. Do not
revisit this by adding a third blend mode to the site.

**`cave-far`** — Tier 1 opaque, 1536×1024, final after explore.
*Keep from the reference:* the cavern's depth and scale; violet crystal clusters as the
dominant light source; the underground river running through the lower frame carrying
reflected violet off wet surfaces — the owner's "crystals plus the water."
*Kill:* the Dreamstime watermark; the digital-fantasy-art rendering, which becomes 35mm
photography with film grain like every other room; the bright white shaft from above,
dropped so the crystals are the light; the overall lavender wash, which falls back to
near-black wet rock with violet only where the crystals actually throw it.
*Room:* Music, accent `#b97fc9` orchid, `--bg-deep` `#0c090f`. Dark. Bone type sits over
this at `--step-display`, so the centre band needs headroom — apply the same measured
band-luminance discipline `jungle-far` got, set numerically in `grade.py`, never prompted
as "darker."

**`cave-near`** — Tier 2 white→multiply, 1536×1024, explore tier.
One image carries both edges. Stalactites hang in from the top edge, light and sparse.
Stalagmites and boulders mass along the bottom edge, heavy — "more bottom." The centre
band is left **pure white**, which under multiply is a hole, so `RECURSION` sits in the
gap and the rock closes over it from both sides as the plate travels.
*Gate:* `checkplate.py`, corner RGB pure white, centre-band coverage ≤25% — which for this
slot is not a constraint fought against but the literal design.

### 4.3 Home — the undergrowth

> "add some bushes or shrubery to the bototm of the home hero so when yous croll name
> goes behind teh shruberry, extra scrolable aniamtion"

A seventh plate. It inserts between `--near` and `--low`, and the two absolutely-positioned
elements above shift up one z so the shrub cannot grow over the lede — `.hero-intro` sits
bottom-left, exactly where undergrowth lives.

| z | plate | `--rate` desktop | `--rate` ≤744px | change |
|---|---|---|---|---|
| 1 | `--far` | −60 | −36 | — |
| 2 | `--fog` | −120 | −70 | — |
| 3 | `--mid` | −190 | −110 | — |
| 4 | `--name` | −250 | −150 | — |
| 5 | `--near` | −350 | −215 | — |
| **6** | **`--shrub`** | **−440** | **−270** | **new** |
| 7 | `--low` | −520 | −320 | was z6 / −440 / −270 |
| 8 | `.hero-intro`, `.hero-progress` | — | — | was z7 |

`.hero` `--stack-h` goes 260vh → 300vh so the shrub has runway to climb. `--shrub` joins
the `mix-blend-mode: multiply` rule and the transparent-frame rule alongside `--mid` and
`--near`.

**`undergrowth-low`** — Tier 2 white→multiply, 1536×1024, explore tier.
Dark tropical undergrowth — elephant ear, tree fern crowns, low broad leaves — massed
across the bottom ~30% of frame as a continuous band, on a pure white ground. Same biome
as the existing `jungle-far`/`jungle-mid`/`jungle-near` set: warm saturated yellow-green
jungle, dense and tangled. Crisp edges. Roll 4 of `jungle-near` was rejected for blur
caused by the words "slightly out of focus" in the prompt; do not repeat that word.
*Gate:* `checkplate.py` at its default band, which is the wordmark band. Coverage there
should measure near **zero**, because at rest the shrub is entirely below the name. The
25% cap is therefore not the real test for this slot — the real test is what the plate
does at full travel, when it has climbed 440px, and that is judged from `filmstrip`
output rather than from a number. Accept only if the wordmark is partly occluded and
still readable at both 1440×900 and 390×844.

**Rejected alternative: doing this in CSS.** It would mean hand-authoring SVG leaf paths,
which reads flat and graphic directly beneath three photographic plates — the
"came out of any builder" failure the project exists to avoid. A generated silhouette is
one explore roll at ~$0.02, cheaper in money and in engineering time. CSS stays available
as a fallback if the rolls do not land.

### 4.4 Workshop — the cottage and the shop

> "a generated iamg eof a cottage, the door should be a speerate image, upon scroll you
> zoom into the cottage and at the same time the door iamge slides to the side to imitate
> entering and opening the door upon scroll, whe yous croll far enough you have fully
> entered the cottage and you are now ina workshop, new seperate image"

Five plates in `#arrive`. `--stack-h` goes 180vh → 320vh.

| z | plate | `--rate` | `--zoom` | content |
|---|---|---|---|---|
| 1 | `--interior` | −60 | 2.2 | the doorway clip box holding `shop-interior`, opaque |
| 2 | `--face` | −120 | 2.2 | `cottage-face`, multiply |
| 3 | `--door` | −150 | 2.2 | `cottage-door`, multiply, hinged |
| 4 | `--copy` | −250 | — | `<h1>Workshop</h1>`, exits early |
| 5 | `--front` | −430 | 3.0 | `needles-near`, multiply |

**The first three plates are one plane and share one `--zoom`.** The doorway, the wall
around it and the door hanging in it all belong to the facade; giving any of them its own
depth would drift it off the opening as the dolly runs. The depth cue instead comes from
*inside* the doorway: the interior image carries its own, much slower scale
(`1 + --p × 0.4`), so a doorway growing 3.2× around a room growing 1.4× reads as walking
toward a far wall.

**`--zoom` is a new primitive.** It composes into the shared `.plate` transform and
defaults to `0`, so every stack currently shipping resolves to `scale(1)` and nothing
moves:

```css
.plate {
  transform:
    translate3d(0, calc(var(--p, 0) * var(--rate, 0) * 1px), 0)
    scale(calc(1 + var(--p, 0) * var(--zoom, 0)));
}
```

Near layers scaling faster than far ones is what makes a dolly-in read as forward motion
rather than a zoom — the same depth rule `--rate` already carries, on a second axis.

**The door swings, it does not slide.** `transform-origin: left center` plus
`perspective()` and `rotateY()` is still a transform and costs nothing extra. A flat slab
translating sideways reads as a barn door. Same image either way, so this is reversible
in CSS alone if the owner dislikes it.

**Two phases, because a pure zoom cannot finish the job.** The doorway occupies roughly
22% of frame width in the facade; growing it to fill a 1440px viewport would need ~4.5×
scale, and a 1536px source has nowhere near that much detail. So:

- `--p` 0 → 0.7: the approach. Facade scales to ~2.5×, the door swings to 95°, and the
  doorway grows from ~22% of frame width to ~56%. The interior is visible through it the
  whole way.
- `--p` 0.7 → 1: `--face`, `--door` and `--front` fade to `opacity: 0` while `--interior`
  keeps scaling. By then the doorway already dominates the frame, so the fade reads as
  the doorframe passing the camera rather than as a dissolve.

Opacity is on the allowed list, so this passes the animation guard. **This is the part of
the spec most likely to need tuning in the browser** — the 0.7 handoff, the 3.2× ceiling
and the 22% doorway are starting values, not measurements, and they get adjusted against
`filmstrip` output once the real facade exists. The ceiling is also what forces
`cottage-face` to be generated at the largest size available: at 3.2× a 1536px source
leaves only ~480px of real detail on a 1440px viewport.

**Ruling: `#inside` reuses `shop-interior`; `bench-far` and `bench-near` are cancelled.**
If the dolly lands the reader inside a room and the very next stack shows a *different*
generated room, the walk-in is undone. `#inside` takes the same file at a closer crop,
set from the panel as framing. Two fewer slots bought, and sitting 6 of the rooms queue
disappears. The owner's nine real furniture photographs further down the page are
unaffected.

**`cottage-face`** — Tier 2 white→multiply, largest available long edge, explore tier.
*Keep from the reference:* the log cabin with its steep shingled roof, the chimney with
smoke, the dark spruce wall pressing in from both sides, the damp overcast light.
*Kill:* the three-quarter camera angle — the facade must be **square-on**, because the
doorway has to be punched out as a clean rectangle in post and perspective makes that
unreliable; the cabin's 45% frame width, which rises to ~70% so there is detail left at
2.1×; the green saturation, which comes down to the room's cold desaturated range.
*Room:* Workshop, accent `#c0a06a` ochre, cold and overcast per the settled direction.
The one warm note in the frame is the light spilling from the doorway. Add no other warm
source, and keep any wood dark and desaturated so it never approaches clay `#cf6b3e`,
which is reserved for clickable things.
*Gate:* **not** `checkplate.py`'s 25% band cap — the cottage is the centre of frame and
must fail it by design. This slot's gate instead is: corner RGB pure white; doorway
present, rectangular and square-on; doorway centre inside 37.5%–62.5% of width.
*Post step:* the doorway is filled to pure white with Pillow after acceptance, so that
under multiply it is a true hole. Deterministic compositing, in the same family as
`grade.py` — not a rescue of a bad render.

**`cottage-door`** — Tier 2 white→multiply, 1536×1024, explore tier.
A single plank door slab, straight on, dark weathered wood with visible grain and simple
iron hardware, alone on a pure white ground. It must match `cottage-face`'s door opening
in proportion and in wood tone, so it is generated after the facade.

**`shop-interior`** — Tier 1 opaque, 1536×1024, final after explore. The owner's
description, verbatim:

> "a man workbench table in the center with a peg board above with some hanging toos, not
> too many. Scissors, hammer, drill, etc. On the desk one side some sanders and wood
> working items, spray paints and paints, left side in general has wood working stuff
> with scraps of wood some wood dust some test painted surfaces, shop should have windows
> on lef tand right. Right side is more thrifting theme, have a small clothes rack with
> 6-8 shirts cool jerseys, graphic tees, polo shirts, mostly soccer jsrseys. That side
> also has tiny sowing things, some glue, some bubble mailer packages, some clear tape
> and other thrifitng thigns nt too clutered."

**The room is split the way the page is split** — refinishing on the left, reselling on
the right, bench and pegboard holding the centre. That maps directly onto the page's
existing `#renew` and `#resell` acts, which is why the room explains the page without a
caption. Build the prompt around the split and keep it legible: left reads as sawdust and
raw wood, right reads as fabric and packaging, and neither side is cluttered.

*Continuity requirement:* the generated room must read as the same place as the nine real
photographs in `assets/img/workshop/`. Read those photographs before writing this prompt
and match their wood tones and lamp colour. A visible switch from AI room to camera
photograph a screen later is the failure mode here.
*Composition:* the bench sits inside the mobile safe band, and the frame must survive
being scaled 1.6×, since `--interior` carries `--zoom: 0.6`.

**`needles-near`** — Tier 2 white→multiply, 1536×1024, explore tier.
Dark spruce boughs entering from the top corners on a pure white ground. Northern spruce,
not tropical — this is the deliberate biome contrast with Home. Crisp edges.
*Gate:* `checkplate.py`, corner RGB pure white, centre-band coverage ≤25%.

---

## 5. Reduced motion

`prefers-reduced-motion: reduce` already collapses `.stack` to `height: auto`, makes
`.stack-view` a static 72svh box and zeroes every plate transform. Each new mechanism
needs an answer inside that block, or it degrades to something broken rather than
something still:

| Mechanism | Reduced-motion behaviour |
|---|---|
| `--shrub` | Static at rest position. It must not cover the wordmark when it cannot travel. |
| Projects haze | `animation: none`. The gradient stays, the drift stops. |
| `--zoom` | Resolves to `scale(1)` because `--p` is 0. Nothing to add. |
| Workshop door | **Hidden.** With no dolly there is no opening, and a permanently shut door in front of a room the reader never reaches is worse than no door. |
| Workshop interior | `#inside` is the reduced-motion path to the shop, and this is why it must survive as a real section rather than being folded into `#arrive`. |

---

## 6. Guards

**`tests/stack-depth.test.ts` gets generalized.** It inspects only `.hero` today, which
means every plate on Projects, Music and Workshop is unguarded and a rate could drift
wrong on three pages silently. It must enumerate stacks rather than hardcode one, and
apply the same strict-increase rule per stack, desktop and mobile.

**A new `--zoom` ordering rule, and it is non-decreasing, not strictly increasing.**
Within a stack that uses zoom, a nearer image plate carries a `--zoom` at least as large
as the one behind it — a far layer scaling faster than a near one reads as the world
inflating rather than the camera moving. Two deliberate exceptions, both of which the
test must encode rather than trip over:

- **`--face` and `--door` are coplanar** and share `--zoom: 1.6`. A door sits *in* the
  doorway it belongs to; giving it its own depth would make it drift off the opening as
  the dolly runs. This is why the rule is non-decreasing.
- **`--copy` is exempt entirely.** It is type, not world geometry, and type never scales
  — `--step-display` already handles its size. The rule applies to image plates only, so
  `--copy` carrying `--zoom: 0` between two plates at 1.6 and 2.4 is correct, not a
  violation.

**`tests/plate-coverage.test.ts` still applies** and its `--rate` compensation is
unchanged. `scale()` values above 1 only ever cover more, so zoom cannot open a bare
strip.

**`tests/base-css.test.ts` sweeps pick the new stylesheet rules up automatically** — it
enumerates `src/styles/*.css` from the directory. The haze keyframe must therefore
animate `transform` only, and no new colour literal may appear outside `tokens.css`.

**`tests/sitewide.test.ts`** requires `data-label` on every `.frame`. Three frames are
new and one is renamed:

| `data-label` | change |
|---|---|
| `Hero L6 — undergrowth-low` | new |
| `Workshop L1 — shop-interior` | new |
| `Workshop L2 — cottage-face` | **renamed** from `Workshop L1 — cottage-far` |
| `Workshop L3 — cottage-door` | new |
| `Workshop L4 — needles-near` | **renamed** from `Workshop L3 — needles-near` |
| `Workshop L5 — shop-interior-close` | **renamed** from `Workshop L4 — bench-far`, and repointed at the same file |
| `Workshop L6 — bench-near` | **deleted** |

`data-label` is also the key the visual editing panel stores framing under, so the
rename drops whatever framing the owner has already set on `cottage-far`. Re-frame it
after the rename rather than expecting it to carry across, and check
`layout.generated.css` for an orphaned `cottage-far` selector afterwards.

**Per-image gates**, which are protocol rather than vitest: `checkplate.py` on every
multiply plate before acceptance, with the exemption and substitute gate for
`cottage-face` recorded in §4.4; `grade.py` with numeric targets on every accepted image,
never a prompted "brighter" or "darker."

---

## 7. Spend

Nine slots. Three finals — `ridge-far`, `cave-far`, `shop-interior` — and six at explore
tier.

| | count | unit | subtotal |
|---|---|---|---|
| Explore rolls, budgeted 2–3 per slot across 9 slots | ~20 | $0.02 | ~$0.40 |
| Finals | 3 | $0.32 | $0.96 |
| | | | **~$1.36** |

Ceiling to approve: **$1.55**, which allows a few extra rolls without a second
conversation. Site-to-date spend is ~$1.95, so this brings the total to roughly $3.30.

Protocol, unchanged from CLAUDE.md §7 and the rooms queue: present the list and the
number, wait for a yes, then generate **one image at a time**, judge it composited in the
page via `filmstrip`, and log every roll including the failures to `docs/image-slots.md`
in the same commit. Stop again if the cost or the slot list changes.

---

## 8. Order of work

Four vertical slices. Each is layers → filmstrip → images one at a time → ledger → commit.

1. **Projects.** Cheapest full exercise of the new pieces: the multiply front plate, the
   title-behind-silhouette read, and the drifting haze.
2. **Music.** Same shape, no haze, plus the two-edge single-plate trick.
3. **Home.** One plate, one image, but it touches the one stack that already ships, so it
   carries the most regression risk and gets a review pass.
4. **Workshop.** The doorway dolly, `--zoom`, the hinged door, and the two-phase handoff.

The guard work in §6 lands with slice 1, before three rooms' worth of new plates exist to
be wrong.

---

## 9. Rulings carried in from this conversation

Recorded so they are not re-litigated:

1. **Composition from the reference, grade from the site.** Every reference is
   reproduced in layout and silhouette and rejected in rendering. The purple crystal
   cavern becomes photography, not digital painting.
2. **The cave's glow lives in the back plate only.** No `screen` blend is added to the
   site. Near-plate crystals are shapes.
3. **`#inside` reuses `shop-interior`.** `bench-far` and `bench-near` are cancelled.
4. **Projects' haze is CSS, not a generated texture.**
5. **The shrubbery is generated, not CSS.** Cheaper in both money and engineering.
6. **The Workshop door swings on `rotateY`,** not a sideways slide.
7. **Room-by-room vertical slices,** not motion-sitewide-then-images. The rooms queue
   already prescribed one room per sitting and it still holds.
