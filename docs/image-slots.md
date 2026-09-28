# Image slots

Per-slot state for every generated image on the site. **Update this in the same
commit as any render.** It is what lets a new session resume without re-deriving
decisions or re-buying an image that already exists.

Tier 1 = CSS, no image. Tier 2 = opaque on flat white/black + blend. Tier 3 =
true alpha (avoid; halos on soft edges).

## Home — hero

| Slot | Role | Tier | Status | Spend | Notes |
|---|---|---|---|---|---|
| `jungle-far` | back, opaque | 1 opaque | **final** | $0.33 | 1536x1024. Owner chose the green/misty direction (B) over warm/amber (A). Graded gamma 1.22 / exposure 0.97, colour shift zeroed: the raw final measured wordmark-band p95 0.835 against bone type at 0.941, too little headroom. Graded band lum 0.488 vs the reference's 0.454. Canopy gap x=54% y=6%, inside the mobile safe band. |
| `jungle-mid` | midground | 2 white→multiply | explore (kept) | $0.02 | 1536x1024. White point pushed to corner RGB 255,255,255. Silhouetted palms/tree ferns in the left and right thirds, centre open. Deliberately NOT taken to final: a flat black silhouette gains nothing from final tier, which saved $0.32. |
| `jungle-near` | front | 2 white→multiply | explore (kept) | $0.07 | 1536x1024, 4th roll. White point pushed to 255. Sharp-edged slim fronds from both edges. Owner rejected roll 3 (reach 42%/59% on screen) as "too much on the name" and "blurry" — the blur was a prompt error ("slightly out of focus"), fixed by demanding crisp edges. Measured edge sharpness 5.96 vs 3.64. Mobile-band coverage 0.0% vs the 25% cap. |

## Home — rest

| Slot | Role | Tier | Status | Spend | Notes |
|---|---|---|---|---|---|
| `server-moss` | ~~thesis back~~ | 1 opaque | **slot removed** | $0.03 | generated 2026-09-14, style anchor for the old spruce set. 2026-09-17: the owner deleted Home's whole `#thesis` section, so this slot no longer exists. The file stays in `assets/img/` — do not re-buy it if a slot ever wants it again. |
| `roots-overlay` | ~~thesis front~~ | 2 white→multiply | **slot removed** | $0.00 | 2026-09-17: never generated, and its slot went with `#thesis`. Do not generate. |
| ~~`life-build`~~ | door | — | **slot removed** | $0.00 | 2026-09-22: never generated. The three doors now serve downscaled crops of each room's own hero instead — see below. Do not buy these. |
| ~~`life-decks`~~ | door | — | **slot removed** | $0.00 | as above |
| ~~`life-rack`~~ | door | — | **slot removed** | $0.00 | as above |
| `door-projects` | door | — | **final (derivative)** | $0.00 | 2026-09-22. 3:2 centre crop of `ridge-far.webp` resized to 960x640, WebP q82. No generation — Pillow only. |
| `door-music` | door | — | **final (derivative)** | $0.00 | 2026-09-22. Same treatment on `ice-plane.webp`. |
| `door-workshop` | door | — | **final (derivative)** | $0.00 | 2026-09-22. Same treatment on `cottage-face.webp`, crop biased 0.45 up the frame to keep the lit window centred. 871kB -> 132kB. |
| `cacheit/app-icon` | portal | — | **final (brand asset)** | $0.00 | 2026-09-22. Copied verbatim from `Dev/personal/Cache It/Mascot-and-Logo-Design/pip/app-icon-red.svg`. Cache It’s own mark. Never regenerate or restyle it — if the product’s branding changes, re-copy from there. |
| `cacheit/city` | portal | — | **final (brand asset)** | $0.00 | 2026-09-22. Downscale of the product’s own `public/city-hero.webp` to 1120px wide. Same rule: re-copy, never re-render. |
| `cacheit/pip` | unused | — | available | $0.00 | 2026-09-22. Downscale of `public/pip-3d.webp`, the 3D mascot. Copied in but not currently placed. |

## Projects — hero

| Slot | Role | Tier | Status | Spend | Notes |
|---|---|---|---|---|---|
| `ridge-far` | back, opaque | 1 opaque | explore (awaiting final) | $0.027 | 1536x1024, roll 1 accepted first time. Graded gamma 1.60 / exposure 1.00, **colour shift zeroed** (`blue=0 green=0 red=0`) — grade.py's default pulls blue out and pushes green/yellow in, which is right for the jungle set and wrong for a slate room. Raw title-band p95 was 0.441 = 2.01:1 against bone, below the 3:1 floor for display type; graded it measures 0.270 = 3.08:1. The fog bank is what sat bright behind the type. |
| `ridge-near` | front | **3 real alpha** | **final** | $0.288 | **2048x1600** RGBA webp q86, **943 KB**. roll-09 (2048x2736), `--ref` roll-08, medium quality, then `tools/mist.py` (slate grade gamma 0.70 + atmospheric veil). **The veil is not decoration.** The render came back with directional sun and hard cast shadows while `ridge-far` is flat overcast, so the pair read as two different days: lum 106 / shadow floor 11 / fine detail 41.4 against the back's 184 / 85 / 16.8. Grading alone closes luminance but not detail (41.4 -> 38.8) because it cannot remove a cast shadow; veiling does both, since most of the micro-busyness IS shadow contrast. After: 144 / 51 / 34.0. Deterministic and re-runnable from roll-09. **Then CROPPED to rows 400-2000**, which is the only part that ever enters the viewport: the rows above the crest are transparent and the rows below ~1200 never scroll into view at any position. Same picture, 1713 KB -> 943 KB, and the shorter source is what let --rate drop 920 -> 830 and the hero runway shorten with it. Mist is applied BEFORE the crop so its band stays where it was judged. Crest g=0.189, full coverage g=0.322, partial alpha 0.128%. Snow crest with rock ribs and couloirs -> ragged treeline ~55% -> dense conifer forest through the bottom third. Local detail 47.8 against roll-07's 20-falling-to-13.6. Renders at **S=1.0, never resampled**, at every viewport up to ~1930px wide — stack.css pins it at its natural 2736px height and positions it with `--front-img-top` instead of scaling it. 1.8 MB is genuine forest detail, not slack encoding: q74 still measures 99.3% of source detail and only saves 300 KB. |

**Roll log:**

| Roll | Cost | Outcome |
|---|---|---|
| `ridge-far` v1 | $0.009 | **accepted.** Layered recession, fog bank across the middle distance, serrated spruce treeline, no sun. |
| `ridge-near` v1 | $0.009 | **rejected — composition, not quality.** Mountain filled the entire frame, so under multiply the title was occluded at scroll 0 and never had a clear moment. See the standing lesson below. |
| `ridge-near` v2 | $0.009 | superseded — correct shape, but Tier 2 multiply left the title legible through the rock. |
| `ridge-far` v3 | $0.009 | superseded — matched the owner's reference for palette, but its dark centre was not dark enough (title band p95 0.534 = 1.69:1). |
| `ridge-near` v3 | $0.009 | **accepted.** `--ref` + `--transparent`. 49% fully transparent / 50.5% fully opaque / 0.45% partial edge. |
| `ridge-far` v4 | $0.009 | **accepted.** `--ref`. Huge dark rock wall across the centre, snow on both flanks. Band p95 0.223 = 3.62:1 with the frame still light at 0.479. |
| `ridge-near` v8 (roll-08) | $0.008 | **composition accepted by the owner.** 1024x1360 explore, `--transparent`, no `--ref`. Replaces the dune-field source: crest g=0.192, full coverage g=0.321, ragged treeline breaking ~55%, dense conifer forest through the bottom third. Local detail 37-46 across the lower frame and RISING toward the base, against roll-07's 20 falling to 13.6 — roll-07's soft repetitive base was the real reason every geometry fix still read as a close-up. Bottom-third luminance 51 (forest) vs roll-07's 158 (bare snow). Awaiting a full-size medium render before it ships; at 1.39 MP it would upscale ~2.7x in the plate. |
| `ridge-near` v9 (roll-09) | $0.28 | **accepted — shipped.** 2048x2736 medium, `--ref assets/img/roll-near-08.png`. `--ref` held the approved composition tightly: crest g 0.1919→0.1890, coverage g 0.3147→0.3129, while local detail rose 35.7→47.8 and the matte cleaned up 0.334%→0.128% partial pixels. Confirms the pattern the skill documents — approve composition at low quality for under a cent, then buy the detail once with `--ref`. |
| ~~`ridge-near` v2~~ | — | ~~**accepted.**~~ Summit at ~47% height with pure white above it; mass unbroken to the bottom edge across 100% of the width; central band bare dark rock, snow on the flanks only. |

**Second standing lesson — the frame-extension rule caps how far a front plate can
travel.** `.plate > .frame` is `height: 100% + |--rate|` and `object-fit: cover` scales
the source to fill it, so asking for more travel zooms the image by the same factor. A
3:2 source at --rate -1200 was magnified 2.3x into an unreadable wall of snow. Two
failed fixes are recorded so they are not retried: mirror-tiling the rock downward to
make the source tall (numbers passed at four viewports, the render was a visible
kaleidoscope), and a portrait 1024x1536 source (cover then scales by WIDTH, which zooms
worse). What works: **match the source aspect to the frame aspect** — roughly square at
desktop sizes — and place the massif by padding transparent rows on top, which moves it
without changing its scale.

**Standing lesson from this sitting — `mix-blend-mode: multiply` darkens the TITLE too.**
The front plate composites against everything beneath it in the stacking context,
including `.plate--copy`. Bone `#f0efe9` multiplied by dark rock becomes dark rock. So a
near plate can never carry a dark mass *behind* type that has to stay readable: the area
the title rests on must be **pure white** (arithmetically invisible), and the dark mass
must arrive only where occlusion is wanted. Roll 1 cost $0.009 to learn this.

**Owner's four corrections to `ridge-near`, all met:** no gap under the mountain
(bottom row measures 100% non-white, so a gap is geometrically impossible); matched to
`ridge-far`'s cold overcast light; title band is dark rock with 0.15% snow-like pixels;
the mountain slides over the name — which needed a rate change, not an image change:
`#ridge .plate--front` went −430→−640 desktop and −250→−380 mobile, taking relative
travel against the title from 170px to 380px.

## Music — hero (Recursion)

| Slot | Role | Tier | Status | Spend | Notes |
|---|---|---|---|---|---|
| `cave-far` | back, opaque | 1 opaque | explore (awaiting final) | $0.009 | 1536x1024, roll 1 accepted first time, `--ref` the owner's lava-tube reference. Violet crystal clusters growing from the rock as the ONLY light source; carnival blue-cyan-red of the reference resolved to the room's orchid. Title band (source 0.28-0.52) measures **16.8:1 against bone**, mobile safe width 16.3:1 — far above the 4.5:1 floor and much darker than `ridge-far`'s shipped 3.08:1. Bottom third carries boulders + crystals, fixing the reference's empty foreground. **Not yet graded.** **Aspect is wrong for the final:** the back frame is 1526x1206 at 1440x900, so a 3:2 source upscales 1.18x (1.40x at 1920). Shoot the final at **1536x1216** (0.99x / 1.32x). |
| `cave-near` | front | 2 white→multiply | explore (kept) | $0.048 | 2048x2048 RGBA webp q86, **745 KB**. roll-04, `--transparent`, matte clamped by `tools/whitepoint.py --alpha` (partial alpha 62.42% -> **0.61%**; `ridge-near` shipped 0.128%, the abandoned `trunks-near` haloed at +24). **Square, not the spec's 1536x1024:** the front frame is 1526x1546 — nearly square — so a 3:2 source upscales **1.51x at 1440 and 1.73x at 1920**. 2048 square measures **S=1.000 at all six viewports**. Geometry decoupled from travel like `#ridge .plate--front`: `--front-img-h: 2048px`, `--front-img-top: calc(1.12*100svh - 1080px)`, `--rate: -930`. Verified in-browser at 1280x800/1440x900/1686x950/1920x1080/390x844/744x1000: title **0.0% occluded at rest** (measured by diffing the title box against the same frame with the plate `display:none`), **0.4-2.3% surviving at full travel**, bottom reach 37-82px past the viewport, `--p` settled to 0.95-1.00 before every capture. |

### Rolls

| Roll | Cost | Outcome |
|---|---|---|
| `cave-far` v1 | $0.009 | **accepted.** `--ref` the owner's lava tube. Receding arch and wet near-black basalt kept; lights resolved to violet mineral clusters; bottom third filled with boulders so the end of scroll has something to land on. |
| `cave-near` v1 | $0.010 | **shipped as the current plate.** Stalactites top (26.5% coverage), pure-white gap 0.28-0.48, boulder mass from 0.52 (85.6% dark). Reads well at rest — see the finding below. |
| `cave-near` v3 | $0.020 | **rejected — failed the solid-rock floor.** 2048x2048 `--transparent`. Clean matte, but the coverage line sat at f=0.718, giving only 2048*(1-0.718) = **577px** of solid rock below it against the **768px** the burial-plus-reach pair requires. No `--rate` can fix this — the rate cancels out of the inequality. |
| `cave-near` v4 | $0.020 | **accepted — shipped.** Prompted for a mass filling the bottom three-fifths rather than a band at a percentage, which the model had ignored twice. Coverage line f=0.604 -> **810px** solid, clearing the 768px floor. |
| `cave-near` v2 | $0.010 | **rejected — the model would not raise the mass.** Prompted for the gap at 0.29-0.41 and the mass from 0.42; got a clean gap (0.0% dark) but the mass still effectively started ~0.55, leaving the occlusion band 0.42-0.55 at only 18.4% coverage (10.5% in the mobile centre). Re-rolling for a precise band placement is the wrong tool — `#ridge`'s decoupled geometry places it in CSS instead. |

**A Tier 3 alpha conversion was built, measured, and REVERTED by the owner.** Recorded because
it cost four rolls and the constraints are real, but **do not re-attempt it on this source.**

Under Tier 2 the title glyphs read 236.5 at rest and 236.3 at full scroll — zero occlusion,
against the owner's "upon scroll name disappears behind cave rock" — and where the rock was
solid, multiply (`top x bottom`) crushed `cave-far`'s crystals to black. Tier 3 alpha fixed both
on the numbers: 0.0% of the title occluded at rest (measured by diffing the title box against
the same frame with the plate `display:none`), 0.4-2.3% surviving at full travel, S=1.000 and
37-82px of bottom reach at all six viewports.

**The owner rejected it on sight anyway, and he was right:** "this blocks the name, its a
completely different colour and its super blurry." The geometry was sound and the picture was
not. Because ~768px of solid rock must sit below the coverage line, the last frame became a
full-screen wall of grey boulders that hid the crystals entirely; the low-quality explore render
was soft, and at S=1.000 that softness shows at full size where the smaller multiply plate hid
it. **Lesson: passing every measured gate is not the same as looking right, and the in-page
screenshot is the check that outranks the numbers.**

Two floors on the SOURCE were derived and still hold if this is ever revisited with a flatter,
darker, sharper roll — writing the three requirements against one offset T and subtracting,
both T and `--rate` cancel:

    (1)  H*(1-fFull) >= 768px    solid rock below the coverage line, or the plate cannot both
                                 bury the title and reach the bottom of the viewport
    (2)  R >= (fFull-fPeak)*H + ledeBottom(0) - titleTop(1)

(2) must use the TRUE first rock of the mass, not the silhouette band's average — using the
average buried the title at BOTH ends. On roll-04, fPeak=0.340 and fFull=0.604 (a 541px spread
of tall thin spires) forced `--rate` to -930. That does not lengthen the scroll: `--stack-h`
stays 180vh, so time-to-content is unchanged.

**Shipped state: roll-01 under Tier 2 multiply**, white point 253.6 -> 255, gap band 99.92%
pure. Title clear at rest, crystals reading through the stalagmite notches. The title is not
occluded at the end and that is accepted for now.


## Workshop — exterior (#arrive)

| Slot | Role | Tier | Status | Spend | Notes |
|---|---|---|---|---|---|
| `cottage-far` | back, opaque | 1 opaque | explore (kept) | $0.010 | **1536x1216**, roll 1 accepted first time. Aspect chosen to match the back frame (1526x1206 at 1440x900), so cover scales 0.99 rather than the 1.18x a 3:2 source would have cost. Square-on log cabin dead centre, steep shingled roof, stone chimney, dense vertical spruce crowding both sides and behind — deliberately **not** a clearing, per the owner. Title band measures **9.01:1** against bone. Warm pixels **0.292%** of frame, confined to the one lit window and its spill on the steps: the settled direction's "only warm light in a cold frame". Forest floor carries roots, stones and needle litter to the bottom edge (std 17.4), so the end of the travel has something to land on. Shot square-on deliberately — it stays forward-compatible with the doorway dolly, which needs a clean rectangular punch. |
| `needles-near` | front | 2 white→multiply | explore (kept) | $0.010 | 1536x1536 square, roll 1 accepted first time. **Square because the front frame is 1526x1546** — a 3:2 source would upscale 1.51x. White point 253.7 -> 255 via `tools/whitepoint.py`. Spruce boughs entering from the top-left and top-right corners only; `checkplate.py` wordmark-band coverage **0.0%** against the 25% cap, so the title sits in clear air. Cold blue-green, crisp needle edges — the deliberate biome contrast with Home's tropical jungle. Corner-RGB gate is failed by design here (two corners hold boughs), same exemption as `ridge-near` and `cottage-face`. |

## Workshop — the doorway dolly

| Slot | Role | Tier | Status | Spend | Notes |
|---|---|---|---|---|---|
| `cottage-face` | facade, opaque | 1 opaque | explore (kept, **roll 2**) | $0.080 | **2560x2048, re-rolled.** Roll 1 (3200x2560, $0.05) was composed with the cabin at ~70% of frame because the ABANDONED zoom design needed detail to survive 4.5x. With the mask reveal that is unnecessary, and the owner rejected it on sight: "starts off very zoomed in you can't see the scene." Roll 2 uses `--ref assets/img/cottage-far.webp` with the prompt pinned to *match the reference's framing exactly*, changing only the door -> an empty opening. Result is the establishing distance he approved, and it fixed mobile as a side effect: a smaller cabin survives the portrait crop. Opening per `tools/doorway.py`: x 0.4797-0.5340, y 0.5522-0.6933, centre 50.68%/62.28%, **5.43% of frame width** (an 18.4x fill), interior std 2.4, centre inside the mobile safe band. Roll 1 stays on disk. |
| `cottage-door` | door slab | 3 real alpha | explore (kept) | $0.010 | 1024x2048, **cropped to 965x2048**. Matte clamped by `tools/whitepoint.py --alpha`: partial alpha 95.44% -> **0.29%**. Strap hinges left, ring handle right, so it swings about its left edge. **Graded gamma 2.036** — the first composite showed it 3.27x brighter than the timber it sits in (81.2 against the wall's 24.8) and read as pasted on; it now measures 26.7. **Then cropped to its opaque bounds:** the generated slab carried ~6% transparent margin, so the wood was narrower than its own image and daylight showed down both sides of the opening. It now spans 0.000-0.999 of its box, and the CSS gives it a further 4% overlap to cover the foreshortening as it swings. |

`cottage-far.webp` was superseded as the hero and was the `--ref` that gave `cottage-face`
its continuity. **Deleted 2026-09-27** in the unused-image sweep below; re-rolling the facade
needs it back from git first.

### Why this is a mask reveal and not a zoom

Filling the screen with an opening that is F of frame width costs a 1/F zoom. This doorway is
10.0% wide, so a literal dolly needs **10x**. Measured source pixels per screen pixel at
1440x900 (plate 1526px; 1.00 = pixel-perfect):

| source | 1.5x | 2.0x | 3.2x | 4.5x |
|---|---|---|---|---|
| 1536 | 0.67 | 0.50 | 0.31 | 0.22 |
| 3200 | 1.40 | 1.05 | 0.66 | 0.47 |

Everything past ~2x is soft and the generator caps at 3840px, so the spec's 3.2x ceiling would
have shipped blurry **and** still not filled the frame. Instead the opening grows and the
picture is held still: `.doorway` scales with the facade while `.doorway__hold` applies the
exact inverse scale. Verified in-browser — the interior frame measures a constant **1526x1305
at --p 0, 0.5 and 1.0**, so it is never resampled, while the hole opens 153px -> 1511px.

**The trap that makes the geometry lie.** `will-change: transform` on `.face` promotes the
subtree to a raster layer which the compositor rasterises once at scale 1 and then scales as a
bitmap. Every number stays correct — the interior still measures 1526x1305 — but the pixels
were drawn at 1/z and blown back up, so the room arrives blurry. Removing it fixed the image
with no change to any measurement. **A metric that cannot see this failure is not a
sufficient check; the screenshot is.** Same lesson as the cave plate, arrived at from the
opposite direction.

`--z` is cubic, not quadratic, so it holds near 1 through the half of the travel where the
facade is the subject (z=2.1 at --p 0.5, still 0.99 source px per screen px) and spends its
acceleration late, under the fade, where softness reads as motion rather than as a bad image.

Timings, all measured against filmstrip output rather than chosen: door swing completes by
--p 0.40 and the slab is gone by 0.60 (running it the full runway left it hanging half-open
and half-transparent across the room — a ghost over the thing you are walking into); title out
by 0.40; needles out by 0.55; facade dissolves 0.55 -> 0.80.

**The hole's growth is SPLIT from the facade's, and that is what buys the hold.** The owner:
*"once you are inside i want to be able to scroll for a tiny bit more until you reach the
words... right now the second you get past the threshold you're already scrolling past the
interior."* He was right — the headline was fully up at --p 0.94 while the room only filled the
frame at 0.96, so it arrived before the thing it was meant to caption.

Locking the opening to the facade alone could not fix it: reaching the 18.4x fill by --p 0.72
would have needed the facade at **52x**, soft long before it finished fading. So `.doorway`
now carries its own `--zx` on top of the facade's `--z`, and `.doorway__hold` cancels BOTH
(`scale(1 / --z / --zx)`). Free, because the facade is at opacity 0 from --p 0.65 — there is
nothing on screen for the extra growth to contradict — and both scale about the same fixed
point, so they compose without drifting.

    --p 0.00-0.40   approach, facade sharp and fully opaque
    --p 0.40-0.65   facade dissolves as the opening opens
    --p 0.72        the room fills the frame
    --p 0.72-1.00   THE HOLD — you are inside, with a 7% continued push so it
                    is still moving forward rather than a frozen picture
    --p 0.86-0.97   the headline fades up, sitting 16% above centre so the
                    pegboard behind it stays readable

**Asked and answered: the facade does NOT need a higher-resolution re-roll.** It is the only
thing in the sequence that ever scales, so the instinct is right — but it is also gone before
it gets big. Measured source pixels per screen pixel *while it is actually visible*:

| --p | z | opacity | 2560 @1440 | 2560 @1920 | 3200 @1920 |
|---|---|---|---|---|---|
| 0.40 | 1.18 | 1.00 | 1.42 | 1.07 | 1.33 |
| 0.50 | 1.44 | 0.60 | 1.17 | 0.88 | 1.09 |
| 0.60 | 1.91 | 0.20 | 0.88 | 0.66 | 0.82 |

At full opacity it is already **above pixel-perfect at both viewports**. It only drops below 1.0
once it is fading, and a 3200 source would move 0.88 to 1.09 at a moment the plate is 60%
transparent. **$0.05 for a difference behind a fade.** The 3200 roll 1 stays on disk if this
is ever revisited.

**Four faults the owner caught that no measurement did.** Recorded because the pattern is the
point: every one passed its gate and still looked wrong.

1. *"Starts off very zoomed in."* Composition, not settings — fixed by re-rolling at the
   establishing distance. See `cottage-face` above.
2. *"The door isn't flush with the hole, you can see through the side cracks."* The slab's 6%
   transparent margin. Cropped, plus a 4% overlap.
3. *"You're met with a blurry interior."* The shipped interior lost **28% of its local detail**
   to webp q86 (detail 5.36 -> 3.85 at 126 KB). Re-exported at q96: 4.77 at 320 KB.
4. *"Then you scroll down to the real interior — it's not a single action."* Correct, and
   structural: `#inside` was a second stack showing the same room. **Merged into `#arrive`**;
   its headline is now a `.plate--threshold` beat that fades up at --p 0.80 once the room has
   actually arrived. `--stack-h` 180vh -> 260vh, so the page scrolls LESS than the old 180+150.

**And one the owner could not have seen, found while fixing his.** `base.css` gives every
`.frame` a default `aspect-ratio`; `stack.css` cancels it, but only for `.plate > .frame` —
DIRECT children. The dolly's frames are nested inside `.face`, so they never got the cancel:
the facade rendered **1526x1018 inside a 1526x1221 box**, 203px short. `.face` still measured
correctly, so every probe looked right, but the doorway and door percentages are measured
against the source — so they all landed low and the door stopped covering its own opening.
`aspect-ratio: auto` on the nested frames fixes it. **If the door ever drifts off the hole
again, check that first.**

**Known trade, not a defect:** at 390x844 the facade must cover a 0.39-aspect plate

## Workshop — interior (#inside)

| Slot | Role | Tier | Status | Spend | Notes |
|---|---|---|---|---|---|
| `bench-far` | back, opaque | 1 opaque | explore (kept) | $0.010 | **This is `shop-interior`.** It ships under the existing `bench-far` slug on purpose — the spec's rename to `shop-interior` belongs with the doorway-dolly task, which repoints `#inside` at the arrival interior; renaming now would churn `workshop.html` and the test for no visible gain. 1536x1216, matching the back frame's 1.266 aspect. Built from the owner's verbatim description (spec §4.4): bench centre, pegboard above with a FEW spaced tools, left side woodworking (sander, clamps, offcuts, sawdust, spray cans, test-painted boards), right side reselling (7-shirt rack of football shirts/graphic tees/polo, bubble mailers, tape, glue, sewing kit), a window on each wall showing cold overcast spruce, one warm practical lamp. **Composition was forced by the copy, not chosen:** `#inside`'s `<h2>` is centred and sweeps source fractions **0.32-0.46**, so the prompt puts dark quiet ceiling and upper wall in the top third and drops the bench lower. H2 band measures **9.33:1 mean / 3.93:1 at p95** against bone — above the 3:1 floor for display type and better than `ridge-far`'s shipped 3.08:1, so **no grade was applied**. Clay check: only 1.80% of pixels within 60 RGB of `#cf6b3e`, and the warm pegboard's mean sits **164 RGB away** from it, so the reserved action colour is not encroached. |
| `bench-near` | front | 2 white→multiply | explore (kept) | $0.010 | 1536x1536 square (front frame is 1526x1546). Near-edge bench clutter — F-clamps, shavings, block plane, brush jar, tape, bubble mailers — as a dark silhouette across the bottom third, top two thirds pure white (0.2% dark) so the headline sits in clear air. `checkplate.py` wordmark coverage **0.6%** against the 25% cap. White point 253.9 -> 255. At rest only ~49px of it is on screen; it sweeps up over the room across the travel, which is the depth cue. **Known cosmetic limit:** multiply over the brightly-lit bench makes the brush jar read semi-transparent. Inherent to Tier 2 over a lit surface — the alternative is Tier 3 alpha, which the owner rejected in the Music room. |

`#inside .plate--front` gets its own `mix-blend-mode: multiply` plus
`background: transparent`, declared separately from `#arrive` rather than as a shared
`.plate--front` rule, because the two front plates must be able to diverge and one of them
will when the dolly lands.

`#arrive .plate--front > .frame { background: transparent }` was missing and is now in
`workshop.css` beside the multiply rule — without it the frame's `--bg-deep` fill paints over
`cottage-far` before the blend can run. Structural, so it does not live in
`layout.generated.css`, which the panel rewrites wholesale on every Save.

**This closed the suite's one long-standing failure.** `tests/workshop-page.test.ts >
references all four arrival image slots` asserted `/assets/img/cottage-far.webp` while the page
still pointed at the stock `images-2.jpg`. **571/571 now pass**, against the 570/571 baseline
every task in this plan has carried.

**Still open in this room:** `shop-interior` (the `#inside` stack still points at the
placeholder `bench-far` / `bench-near`), `cottage-door`, and the doorway dolly itself.
The stock reference `images-2.jpg` is deliberately NOT deleted — per Ruling 10 references are
swept in the final cleanup task, never in a room's own image task.

## Cache It — case study

All five slots are the product's OWN art, copied from `Dev/personal/Cache It` and
resized/cropped with Pillow. No generation, $0.00. Same rule as the portal: if the
product's art changes, re-copy from there, never re-render here. The old
`cacheit-street` / `cacheit-scan` / `fronds-near` slots (photographic street art,
never generated) are replaced, not deferred. Do not buy them.

| Slot | Role | Tier | Status | Spend | Notes |
|---|---|---|---|---|---|
| `cacheit/tap` | hero 16:9 | — | **final (brand asset)** | $0.00 | 2026-09-24. `reference/pip-explores/pip-explore-4.png` rows 170-1034 -> 1536x864. #4 chosen of the four because it has the most headroom; the other three lose Pip's head or feet at 16:9. The other three are near-duplicates, do not add them elsewhere. |
| `cacheit/city-plate` | stack back | 3 alpha | **final (brand asset)** | $0.00 | 2026-09-24. `reference/hero-source/city-hero.png` trimmed to its alpha bbox, 1600x841. Contained, not covered (case-study.css), at object-position 74% so the pull quote clears the spires. |
| `cacheit/clouds` | stack front | 3 alpha | **final (derivative)** | $0.00 | 2026-09-24. Clouds 1,2,3,4,6 from `reference/hero-source/` composited on a 1600x2000 transparent canvas. Cloud 5 was dropped: on desktop it drifted across the Y of the pull quote. Clouds sit in the lower-middle so phones see them from the first frame. Filmstripped at 1440x900 and 390x844. |
| `cacheit/screen-onboard` | screens row | — | **final (screenshot)** | $0.00 | 2026-09-24. `Ideas and Screenshots/Screenshot_1785272735.png` (Android) cropped to 388:839 and resized to 388x839 so all three screens share one ratio. |
| `cacheit/screen-home` | screens row | — | **final (screenshot)** | $0.00 | 2026-09-24. `Cache it post1.PNG`, re-encoded only. |
| `cacheit/screen-collection` | screens row | — | **final (screenshot)** | $0.00 | 2026-09-24. `Cache it post2.PNG`, re-encoded only. The login screen (`Cache it psot.PNG`) was left out as the least interesting of the four. |

## Other rooms

See `docs/image-rooms-queue.md`. All placeholders, none planned yet by design.

## Abandoned

| File | Spend | Why |
|---|---|---|
| `canopy-far` | $0.19 | wrong biome (spruce), and structurally hidden behind an opaque plate |
| `trees-back` | $0.83 | wrong biome; rescued in post by rotating hue 200→81, which is the practice this plan bans |
| `trunks-near` | ~$0.45 | Tier 3 alpha cutout, arrived haloed at +24 RGB, needed hand un-matting |

**Running total spent to date: ~$2.43.** ($1.95 before this sitting, plus $0.035 across four Projects explore rolls and one $0.28 medium render. `ridge-far` remains explore; its $0.32 final is approved but unspent. Music adds $0.048 across 4 explore rolls and Workshop $0.100 across 6. The owner approved a further ~$0.10 for the dolly; $0.09 of that was spent across 3 rolls (facade, door, facade re-roll), $0.01 unused.)

**Superseded:** _Running total spent to date: ~$1.95._ Of that, $0.45 is this sitting and all of it is
on the page: $0.126 across 7 explore rolls (14 images) plus one $0.32 final. Approved ceiling
was $0.18 explore + $0.32 final = $0.50, so the sitting came in $0.05 under.
Recovered from earlier sittings: $0.03 (`server-moss`).

**What the explore budget bought, including the rolls that failed** — kept here because the
failures are the reason the final worked first time:

| Roll | Cost | Outcome |
|---|---|---|
| far A/B | $0.02 | B chosen by the owner; set the direction |
| mid v1/v2 | $0.02 | v1 passed the white gate at corner min 253, v2 failed at 0 |
| near v1/v2 | $0.02 | v2 passed; left edge only |
| near v3 (both sides) | $0.02 | owner asked for leaves crossing the Y and final P |
| far "lighter" | $0.02 | **overshot** — lum 0.670, band 0.869; unusable, but it bounded the range and proved the lift belonged in `grade.py`, not the prompt |
| near v4 (more reach) | $0.02 | **rejected** by the owner: too much on the name, and blurry |
| near v5 (sharp, slim) | $0.02 | accepted |
| **far final** | **$0.32** | accepted, graded |

**Second standing lesson — the frame-extension rule caps how far a front plate can
travel.** `.plate > .frame` is `height: 100% + |--rate|` and `object-fit: cover` scales
the source to fill it, so asking for more travel zooms the image by the same factor. A
3:2 source at --rate -1200 was magnified 2.3x into an unreadable wall of snow. Two
failed fixes are recorded so they are not retried: mirror-tiling the rock downward to
make the source tall (numbers passed at four viewports, the render was a visible
kaleidoscope), and a portrait 1024x1536 source (cover then scales by WIDTH, which zooms
worse). What works: **match the source aspect to the frame aspect** — roughly square at
desktop sizes — and place the massif by padding transparent rows on top, which moves it
without changing its scale.

**Standing lesson from this sitting:** never ask a prompt for "brighter" or "darker". Prompt
for the subject and the light, then set exposure numerically in `grade.py` against a measured
target. The one prompted brightness change overshot by 2.7x and cost a roll.

## Unused-image sweep — 2026-09-27

The owner asked for every image the site does not use to be deleted. 55 files, 145 MB, removed
with `git rm` (last commit that still holds them: `5144d18`). Gone: every `roll-*.png` except
`roll-near-09.png`, the stock references (`1000-f-…`, `360-f-…`, `20740152436-…`, `images-2.jpg`,
`purple-crystals-…`, `snow-mountain-…`, `CDj.webp`, `Fossil.jpg`, `ICE.jpg`, `ref-jogwheel.png`,
`recursion-logo.png`), and the retired plates `cave-near`, `jungle-near`, `jungle-mid`,
`server-moss`, `cottage-far`, `cacheit/pip`. This reverses the earlier keep-the-references and
keep-roll-1 rulings. **Rows above that say "stays on disk" or "kept" for a roll now mean "in git
history".** Restore any one with `git checkout 5144d18 -- <path>`.

`roll-near-09.png` is deliberately kept: it is the only uncropped original of `ridge-near.webp`
and `tools/mist.py` takes it as input.

## 2026-09-28 — Workshop hero restored after a blur report

A visitor reported the Workshop room as "very blurry when you scroll in". The
2026-09-22 launch-prep q82 pass had re-encoded the dolly plates: `bench-far` 320 KB ->
97 KB with local detail **2.16 -> 1.66 (-23%)**, the same loss that was fixed once
before with the q96 export, and `cottage-face` downscaled **2560x2048 -> 1920x1536**
although the facade scales to 8x. Both restored byte-for-byte from `5bc151a^`. Spend
$0.00. `cottage-door` and `needles-near` measured no loss and keep their q82 files.
