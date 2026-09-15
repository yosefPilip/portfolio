# Image slots

Per-slot state for every generated image on the site. **Update this in the same
commit as any render.** It is what lets a new session resume without re-deriving
decisions or re-buying an image that already exists.

Tier 1 = CSS, no image. Tier 2 = opaque on flat white/black + blend. Tier 3 =
true alpha (avoid; halos on soft edges).

## Home — hero

| Slot | Role | Tier | Status | Spend | Notes |
|---|---|---|---|---|---|
| `jungle-far` | back, opaque | 1 opaque | placeholder | $0.00 | canopy gap + light at ~60% width; quiet centre-left for the wordmark |
| `jungle-mid` | midground | 2 white→multiply | placeholder | $0.00 | silhouetted palms, no environment |
| `jungle-near` | front | 2 white→multiply | placeholder | $0.00 | left edge only, ≤25% of the wordmark band |

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

**Running total spent to date: ~$1.50. Recovered: $0.03 (`server-moss`).**
