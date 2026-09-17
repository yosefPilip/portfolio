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
| `server-moss` | thesis back | 1 opaque | **done** | $0.03 | generated 2026-09-14, style anchor for the old spruce set |
| `roots-overlay` | thesis front | 2 white→multiply | placeholder | $0.00 | out of scope this sitting |
| `life-build` | panel | 1 opaque | placeholder | $0.00 | out of scope this sitting |
| `life-decks` | panel | 1 opaque | placeholder | $0.00 | out of scope this sitting |
| `life-rack` | panel | 1 opaque | placeholder | $0.00 | out of scope this sitting |

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

## Other rooms

See `docs/image-rooms-queue.md`. All placeholders, none planned yet by design.

## Abandoned

| File | Spend | Why |
|---|---|---|
| `canopy-far` | $0.19 | wrong biome (spruce), and structurally hidden behind an opaque plate |
| `trees-back` | $0.83 | wrong biome; rescued in post by rotating hue 200→81, which is the practice this plan bans |
| `trunks-near` | ~$0.45 | Tier 3 alpha cutout, arrived haloed at +24 RGB, needed hand un-matting |

**Running total spent to date: ~$2.27.** ($1.95 before this sitting, plus $0.035 across four Projects explore rolls and one $0.28 medium render. `ridge-far` remains explore; its $0.32 final is approved but unspent.)

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
