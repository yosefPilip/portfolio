# Image rooms queue

Every remaining image slot on the site, one room per sitting. **Home's hero goes first** and
is the pilot — it proves the layer architecture, the filmstrip and the spend protocol. Its
spec is `docs/superpowers/specs/2026-09-14-home-hero-jungle-design.md`.

Once Home lands, the rest are small: two images each against a proven pipeline. They do not
need their own specs — a task brief each is enough. **Do not plan them in advance.** If the
hero session changes the architecture, pre-written plans become wrong plans.

State per slot lives in `docs/image-slots.md`, not here. This file is the queue and the
settled creative direction only.

---

## Order

| # | Sitting | Slots | Biome / setting | Room accent |
|---|---|---|---|---|
| 1 | **Home — hero** | `jungle-far`, `jungle-mid`, `jungle-near` | sunlit tropical jungle, volumetric shafts | sage `#8aa572` |
| ~~2~~ | ~~Home — rest~~ | ~~`life-build`, `life-decks`, `life-rack`~~ | **cancelled 2026-09-22** | — |
| 3 | Projects | `ridge-far`, `ridge-near` | ridgeline | slate |
| 4 | Music | `cave-far`, `cave-near` | cave | orchid `#b97fc9` |
| 5 | Workshop — exterior | `cottage-far`, `needles-near` | northern spruce forest, cottage with one lit window | ochre `#c0a06a` |
| 6 | Workshop — interior | `bench-far`, `bench-near` | the workbench, inside the cottage | ochre |
| ~~7~~ | ~~Cache It~~ | ~~`cacheit-street`, `cacheit-scan`~~ | **cancelled 2026-09-24**, filled from the product's own art, see image-slots.md | — |

Home's three "Elsewhere" doors were rebuilt on 2026-09-22 as downscaled crops of each
room's own hero — `ridge-far`, `ice-plane`, `cottage-face` — so a door shows the page it
opens. That is strictly better than three unrelated generated stills and it cost nothing,
so sitting 2 is cancelled rather than deferred. Don't re-open it.

`server-moss.webp` and `roots-overlay` belonged to Home's `#thesis` stack, which the owner
deleted on 2026-09-17. Both slots are gone: don't generate `roots-overlay`, and don't re-buy
`server-moss` — the generated file is still in `assets/img/` if a future slot wants it.

`assets/img/workshop/` holds nine photographs the owner took of two real pieces of furniture
he refurbished. **Never generate, replace, re-export or colour-grade these** — a generated
image presented as real refurbished work is a fabricated portfolio item.

---

## Settled direction — do not re-litigate

**Home and Workshop are deliberately contrasting biomes.** Both forests, so the site still
reads as one world, but visibly different:

| | Home | Workshop |
|---|---|---|
| Biome | tropical jungle, palms and tree ferns | northern spruce |
| Structure | dense, tangled, layered | vertical, tall straight trunks, clear floor |
| Light | warm volumetric shafts through a high canopy | cold, flat, overcast |
| Colour temp | saturated yellow-green | cold blue-green, grey |

**Workshop stays cold and overcast.** Spec §12's original lock still governs every room
except Home; only Home's is amended. What binds the site together is no longer the grade —
it is 35mm, film grain, the depth-fog structure, and the bone-on-charcoal UI.

**Workshop's warm note is the cottage window** — the one warm light in a cold frame, which is
what makes "go inside" legible without a word of instruction. Do not add other warm sources,
and keep any redwood bark dark and desaturated so it never approaches clay `#cf6b3e`, the
reserved clickable signal.

---

## Rules that carry to every sitting

1. **Explorations before finals, always.** Show them composited in the page via
   `tools/filmstrip.mjs`, never as loose files. Hard stop before any final.
2. **Never grade a miss into looking acceptable.** Wrong biome means the prompt is wrong —
   re-roll at explore price. `tools/grade.py` does fine matching between approved images only.
3. **Only one opaque plate per stack.** Everything above it is white → `mix-blend-mode:
   multiply`, applied to the `.plate`, never the `.frame`. No alpha cutouts.
4. **Never batch.** One image at a time, judged in-page after each.
5. **Log every render** — explore and final — to `docs/image-slots.md` with its cost.
6. **Mobile safe band.** At 390×844 only the centre ~25% of a 3:2 source's width survives.
   Everything load-bearing sits inside 37.5%–62.5%.
7. **Spend needs a yes.** Present slots, dimensions and estimated cost; wait. Per CLAUDE.md §7.
