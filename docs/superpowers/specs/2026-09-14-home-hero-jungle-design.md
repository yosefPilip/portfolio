# Home Hero — the jungle rebuild

**Written 2026-09-14.** Supersedes spec §7's seven CSS trunks and amends §12's shared
prompt lock for Home only. Everything else in
`2026-09-11-portfolio-overgrowth-rebuild-design.md` stands.

**Owner reference:** `docs/refs/home/` — the sunlit tropical jungle image. It is the
target. When this spec and the reference disagree, the reference wins.

---

## 1. Why the current hero fails

The owner's words, 2026-09-14:

> "Right now I created a dark, moody, scary forest. And I was looking for more of a little
> more vibrant, jungly, more wet, still foggy, but more jungly and more dense forest. Right
> now the front trunks that cover the name are way too thick and cover most of my name. And
> when you scroll down, you see the floating cutout images and they do not blend well at all
> with the background image. There's also a weird opaque canopy at the top that just doesn't
> really make sense or fit in with the photo. And it moves down, which also doesn't make sense."

**Three of those four are structural. Generating better images fixes none of them.**

| Symptom | Actual cause |
|---|---|
| Front trunks cover the name | `trunks-near.webp` sits at `z-index: 5`, above the wordmark at `z-index: 4`. No coverage budget exists. |
| Cutouts don't blend | `trunks-near` is a **Tier 3 true-alpha cutout**. It arrived haloed (edge pixels +24 RGB lighter than the trunk, matte `rgb(116 112 84)`) and was hand-un-matted. A repaired alpha channel is still an alpha channel. |
| Weird canopy band that drifts down | `canopy-far` and `trees-back` are **both opaque and full-bleed**, so the upper hid the lower completely. A mask (`transparent 0% → --fg 46%`) was added to reveal it. That seam is the band. |
| Dark and scary, not lush | Spec §12's lock mandates *"deep desaturated greens and wet black, underexposed, overcast."* It is doing exactly what it says. |

**The root cause of the biome miss:** `trees-back`'s final render came out cold blue-grey
("the spruce look again") and was rescued in post by rotating hue 200 → 81. The prompts
generate northern forest; `tools/grade.py` strains to turn it tropical. The result is a
repaired spruce forest, not a jungle.

**Standing rule from this:** never grade a miss into looking acceptable. If a render is the
wrong biome, the prompt is wrong — re-roll at explore price. `grade.py`'s job is fine
matching *between approved images*, never rescue.

---

## 2. What the reference actually specifies

The important property of the reference is not its green. It is that the light is
**inverted** from the current hero.

| | Reference | Current hero |
|---|---|---|
| Brightest point | canopy gap, blown-out humid haze | none — uniformly dark |
| Foreground | **near-black silhouette**, almost no detail | mid-grey, fully detailed, haloed |
| Midground | the glowing layer — saturated yellow-green, mist | flat |
| Light | volumetric shafts, warm, directional | no source at all |
| Depth cue | aerial perspective — each plane lighter, softer | a masked cross-fade seam |

The current hero is not under-saturated so much as **unlit**. Fog with no light behind it is
grey; fog with a shaft through it is the entire effect.

### 2.1 Amended §12 lock — Home only

| §12 sitewide | Home |
|---|---|
| overcast, flat light | **volumetric crepuscular shafts**, warm, directional, breaking from the upper right |
| deep desaturated greens | saturated yellow-green where lit, falling to near-black in shadow |
| underexposed throughout | wide range — blown highlights at the canopy gap, crushed foreground |
| (unspecified species) | dense tropical palms and tree ferns; no ground, no path, no sky except the gap |

**Kept sitewide, and now the only thread binding Home to the other rooms:** 35mm, visible
film grain, no neon / HDR / CGI / plastic sheen / text / watermark / people.

**The one trap that will cost a render.** `lens flare` is on the shared negative list, and
generators routinely read it as "no shafts" and flatten the light out. The prompt must ban
*artifacts* — anamorphic streaks, ghosting — while **explicitly requiring** crepuscular rays.
That distinction is the single most important line in the prompt.

---

## 3. Layer architecture — only one opaque plate

This is the core change. Two opaque full-bleed photographs cannot stack; that collision is
what forced the mask, and the mask is the seam. **Only the far plate is opaque. Everything
above it is Tier 2 — dark subject on pure white, composited with `multiply`.**

| z | Plate | Content | Technique |
|---|---|---|---|
| 1 | `.plate--far` | distant layered forest receding into bright haze; **the canopy gap and light source live here** | opaque, full-bleed |
| 2 | `.plate--fog` | atmosphere | CSS, unchanged |
| 3 | `.plate--mid` | silhouetted palm trunks and fronds | **white → `multiply`** |
| 4 | `.plate--name` | the wordmark | — |
| 5 | `.plate--near` | sparse frond tips, one edge | **white → `multiply`** |
| 6 | `.plate--low` | floor darkening | CSS, unchanged |

### 3.1 Why multiply, not better cutouts

Any alpha approach must *decide*, per pixel, how much of that pixel is subject. At a frond
tip or a wisp of mist that decision is wrong somewhere, and the error reads as fringe because
the background it was cut from differs from the one it lands on. Better segmentation models
make the decision better; they do not remove the decision.

`multiply` removes the decision: `result = backdrop × source`. A frond edge 60% dark darkens
by 60%, automatically, with no matte and no threshold. **Soft wispy edges are the case
multiply handles best and alpha handles worst** — which is precisely this subject matter.

This repo has run the experiment both ways: the alpha cutout haloed; multiply shipped clean
on Workshop at `06a1fb3`.

**Implementation gotcha, already paid for once.** `mix-blend-mode` blends within the nearest
stacking context, and `.plate` sets `will-change: transform`, which creates one. The blend
must be applied to the **`.plate`**, never to the `.frame` inside it. Follow the working
precedent at `src/styles/workshop.css:24`. Confirm no ancestor sets `isolation: isolate`.

### 3.2 Rename the plates to encode depth

`.plate--canopy` was assigned `--rate: -60`, the **slowest** rate in the stack — i.e. treated
as the most distant layer. A canopy is directly overhead: the *nearest* thing in frame. The
name carried no depth information, so nothing made the contradiction visible.

Classes become `--far` / `--mid` / `--near`; images become `jungle-far.webp`,
`jungle-mid.webp`, `jungle-near.webp`. `canopy-far.webp`, `trees-back.webp` and
`trunks-near.webp` are deleted.

**Guard:** a test asserting that within any `.stack`, `|--rate|` increases monotonically with
`z-index`. Nearer layers always move faster. Cheap, and it catches the whole class of error.

---

## 4. The wordmark contract

The reference is brightest in the centre. The wordmark is bone `#f0efe9` — near-white — and
centred. **The composition must reserve a dark region for it.** Owner's ruling: keep the
fronds crossing the name (it is the signature), but thin them.

1. The `.plate--far` composition keeps its **centre-left dark**; the canopy gap sits right of
   centre.
2. `.plate--near` enters from the **left edge only** and covers **≤25%** of the wordmark band.
3. That 25% is **measured, not judged**: the fraction of non-white pixels in the centre
   horizontal strip of the source image. It ships as a test, so "too thick" cannot reach the
   page by feel again.

Physically coherent as a bonus: light from the upper right means left-hand foreground is
backlit and near-black — exactly what `multiply` wants.

### 4.1 The mobile safe band — this constrains composition hardest

Measured, established fact (do not recompute): at 390×844 the plate is **398 × 1047**, aspect
**0.38:1**. A 3:2 source cropped into that by `object-fit: cover` keeps only the **centre
25.3% of its width**.

```
  source 3:2
  ┌───────────────────────────────────────┐
  │        │                     │        │
  │        │   SAFE BAND         │        │   only this survives on a phone
  │        │   37.5% ── 62.5%    │        │
  │        │                     │        │
  └───────────────────────────────────────┘
           ↑                     ↑
       everything outside is gone at 390×844
```

**Therefore "upper right" means ~60% of source width, not 85%.** Both load-bearing
elements — the canopy gap *and* the reserved dark zone — must sit inside 37.5%–62.5%. The
plate also overscans `-12%` vertically and `-3%` horizontally for parallax travel, so the
outer ~12% top and bottom is crop margin and never guaranteed visible.

---

## 5. Verification — the filmstrip

The reason these bugs survived is that verification measured numbers instead of looking.
`canopy-far` being 100% invisible took a full `elementsFromPoint` audit to find; "the cutouts
don't blend" was never caught at all. Neither is a number problem.

`tools/filmstrip.mjs` drives the page with **real `mouse.wheel()` events** (per CLAUDE.md §3
— never programmatic scroll), captures the hero at 8–10 scroll positions, and tiles them into
one image:

```
scrollY  0%     15%    30%    45%    60%    75%    90%
       ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
       │    │ │    │ │    │ │    │ │    │ │    │ │    │
       └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘
```

Run at **1440×900 and 390×844**. This is how the owner reviews motion without scrolling and
describing, how image explorations get shown in-page, and the regression check afterward.

**Build it before anything else. It costs nothing and every later judgement depends on it.**

---

## 6. Spend protocol

The failure to avoid: $1.50 spent on finals the owner never chose, because explorations were
never shown.

1. **Structural fixes and the filmstrip land first.** Zero spend. Hero works on placeholders.
2. **Explore tier only:** 2 variants × 3 slots × ~$0.03 = **~$0.18 ceiling.**
3. **Shown composited in the page**, via filmstrip, at both viewports — never as loose files.
   A back plate that looks good alone is usually wrong behind type.
4. **Hard stop.** No final until the owner points at a direction.
5. Finals one at a time, judged in-page after each. **Never a batch.**
6. WebP ~q72. Report dimensions and bytes per file; a 4MB hero is a defect.
7. Every render — explore or final — logged to the manifest with its cost.

### 6.1 The slot manifest

`docs/image-slots.md`, one row per slot: path · layer role · blend tier · source dimensions ·
grade args · status · cumulative cost. This is the artifact that lets any session resume
without re-deriving decisions, and without re-buying an image that already exists.

**Related standing risk:** `tools/grade.py` previously lived only in a session scratchpad and
was nearly lost. Anything that defines how the set looks belongs in the repo.

---

## 7. Prompts

Shared Home lock, prepended to all three:

> 35mm film photograph, dense tropical rainforest, palms and tree ferns, humid mist, wet
> foliage, volumetric crepuscular light shafts breaking through a high canopy from the upper
> right, saturated yellow-green where the light lands falling to near-black in shadow,
> visible film grain, natural colour.
>
> Negative: anamorphic streaks, lens ghosting, HDR, neon, cyberpunk, oversaturated,
> vaporwave, CGI render, plastic sheen, text, watermark, logo, people, path, trail, visible
> sky except through the canopy gap.

- **`jungle-far`** — opaque. Distant layered forest receding into bright humid haze. The
  canopy gap and its light at ~60% width. **No dominant subject**; low contrast and quiet
  across the centre-left, where the wordmark sits. Aerial perspective: each further plane
  lighter and softer.
- **`jungle-mid`** — on **pure white `#ffffff`**, flat and uniform. Silhouetted palm trunks
  and frond masses, **midground only**. No environment, no ground, no sky, no horizon. Dark
  against white, nothing else in frame.
- **`jungle-near`** — on **pure white `#ffffff`**, flat and uniform. A few large fern and palm
  frond tips entering from the **left edge only**, under 30% of the frame, remainder pure
  white. Near-black, backlit, minimal internal detail.

**Ruling 7 carries forward:** sample the generated background's corner pixels and report RGB
before judging any composite. If not `255,255,255`, push the white point first — an off-white
background leaves a grey wash under multiply and misreads as "the blend doesn't work."

---

## 8. Out of scope

Deliberately excluded so this session stays one sitting:

- `roots-overlay` (thesis front plate) and the three Life images — Home, but a separate sitting.
- Projects, Music, Workshop and Cache It slots — see `docs/image-rooms-queue.md`.
- `server-moss.webp` — already generated and in a different stack. Untouched.
- `assets/img/workshop/` — the owner's own photographs of real furniture. **Never generate,
  replace, re-export or grade these.**
- **No deploy.** Outward-facing actions stop and ask, per CLAUDE.md §7.

## 9. Gate

```
npm test && npx tsc -b --noEmit && npm run lint && npm run build
```

All four green. Tests are never skipped or weakened to move faster.
