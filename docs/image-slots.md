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

## Other rooms

See `docs/image-rooms-queue.md`. All placeholders, none planned yet by design.

## Abandoned

| File | Spend | Why |
|---|---|---|
| `canopy-far` | $0.19 | wrong biome (spruce), and structurally hidden behind an opaque plate |
| `trees-back` | $0.83 | wrong biome; rescued in post by rotating hue 200→81, which is the practice this plan bans |
| `trunks-near` | ~$0.45 | Tier 3 alpha cutout, arrived haloed at +24 RGB, needed hand un-matting |

**Running total spent to date: ~$1.95.** Of that, $0.45 is this sitting and all of it is
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

**Standing lesson from this sitting:** never ask a prompt for "brighter" or "darker". Prompt
for the subject and the light, then set exposure numerically in `grade.py` against a measured
target. The one prompted brightness change overshot by 2.7x and cost a roll.
