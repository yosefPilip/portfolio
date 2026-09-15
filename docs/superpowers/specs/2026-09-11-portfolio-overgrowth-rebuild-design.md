# yosefpilip.com — full rebuild: copy, structure, and visual system

**Date:** 2026-09-11
**Status:** approved design, ready for implementation planning
**Supersedes:** the visual half of `2026-07-03-bio-terminal-redesign-design.md`

---

## 1. What this is

A complete rework of the portfolio: every word rewritten, the information
architecture rebuilt, and a new visual system. The existing pages (Home,
Projects, DJ & Music) keep their identities, and a fourth room, **Workshop**,
is added (§8.4).

The site is a **personal brand hub**, not a recruiting funnel. One link that
works for a recruiter, a Zip Launchpad mentor, a promoter, and a friend. Each
of those people gets routed to the right room quickly rather than being funneled
toward a single call to action.

### Source of truth for content

**The résumé is canon.** Where the current site and the résumé disagree, the
résumé wins:

- CloudGeometry is **one continuous role**, AI Software Developer, May 2025 –
  Present. The site's split into "Software Developer (May–Aug 2025)" and "AI
  Software Developer (Jan 2026–Present)" is dropped.
- **Aztec Robotics** (President & Software Lead) is not on the résumé and is
  dropped from the site.
- **Tzofim North America** (Head Counselor, Aug 2021 – Jun 2024) is added.
- **Russian is Advanced/Conversational**, not Native.
- **Cache It uses NFC**, with an upgrade path to NTAG 424 DNA chips.

### Relationship to the Open Design "Overgrowth" artifact

An Open Design run produced a design system called *Overgrowth* plus a vanilla
HTML prototype. It is used as **design inspiration only** — layout posture,
typography, color discipline, motion technique, and image placement.

**None of its content is used.** Specifically rejected as invented or wrong:
`Apali`, the `Pip` mascot as a standalone project, "React/Node/Postgres" as the
stack, the "three lives" framing as the site's spine, reselling as a co-equal
headline pillar, and the claim that Cache It works by image recognition against
the artwork rather than NFC.

Prototype location (read-only reference, not a dependency):
`%APPDATA%\Open Design\namespaces\release-stable-win\data\projects\1ad09b19-b893-4588-bede-b891d7865130`

---

## 2. The concept

**The page is the soil; the images are the growth.**

Green does not live in the interface. It lives in the photography. The UI is a
dark, neutral, bone-on-charcoal ground with one warm accent. Every page is a
different natural setting, rendered as scroll-linked depth layers.

If UI chrome starts turning green, the concept has broken.

---

## 3. Color

### 3.1 Fixed sitewide

These never change between pages. They are what makes four rooms read as one
building.

```css
:root {
  --fg:            #f0efe9;  /* bone — never pure white */
  --fg-dim:        #c2c4bc;  /* secondary prose */
  --muted:         #8e958a;  /* labels, meta, dates */
  --border:        rgba(240, 239, 233, 0.12);
  --border-strong: rgba(240, 239, 233, 0.24);

  --accent:        #cf6b3e;  /* clay — ACTION only */
  --accent-press:  #b45a31;  /* clay, pressed state */
}
```

### 3.2 Per-room overrides

One `[data-room]` block each. Same lightness, different hue cast — that is what
makes a page feel like a different room without touching contrast.

```css
[data-room="home"]     { --bg:#171b19; --bg-deep:#0f1512; --surface:#1f2422; --surface-tint:#222c25; --accent-2:#8aa572; }
[data-room="projects"] { --bg:#16191d; --bg-deep:#0e1115; --surface:#1f232a; --surface-tint:#222831; --accent-2:#7f9bbd; }
[data-room="music"]    { --bg:#1a171d; --bg-deep:#0c090f; --surface:#24202a; --surface-tint:#2a2130; --accent-2:#b97fc9; }
[data-room="workshop"] { --bg:#1b1917; --bg-deep:#12100e; --surface:#241f1b; --surface-tint:#2b2621; --accent-2:#c0a06a; }
```

| Room | Setting | Category color |
|---|---|---|
| Home | jungle floor | sage `#8aa572` |
| Projects | mountain ridgeline | slate `#7f9bbd` |
| DJ & Music | cave club | orchid `#b97fc9` |
| Workshop | the workbench | ochre `#c0a06a` |

Ochre `#c0a06a` sits closest to clay of the four category colours, in both hue
and chroma. A desaturated sand `#b5a184` was proposed to widen that gap; the
owner kept ochre, and the Resale page becoming a **Workshop** page (§8.4) makes
ochre the more honest colour anyway — sawdust, raw wood and warm shop light,
rather than a clothing rack. **This is the one pairing to verify visually before
shipping.** If clay and ochre blur in context, desaturate ochre toward `#b5a184`
rather than shifting its hue, which would pull it toward sage.

### 3.3 The role split — load-bearing rule

| | Color | Means | Appears on |
|---|---|---|---|
| Primary | clay `--accent` | "this is clickable" | filled buttons, link arrows, next-project arrow |
| Secondary | `--accent-2` | "this is a category" | eyebrows, active filter pills, hovered year column |

- **Never put clay on something that isn't clickable.** That constraint is the
  entire reason the per-page color is safe: a visitor learns one signal once and
  it holds in every room, so a shifting palette reads as atmosphere rather than
  confusion.
- `--accent-2` is never a button fill, except the **active filter pill** — which
  is a selected state, not an action.
- Max ~2 visible uses of each color per screen.
- Buttons are **solid fills with dark text**, not outlines, with 2px press travel.
- Zero hardcoded hex outside the token blocks. Use
  `color-mix(in oklab, var(--token) N%, transparent)` for tints.
- All other color comes from photography.

### 3.4 Contrast gates

Body ≤16px on `--bg`: **4.5:1**. Large text: **3:1**. Dark text on a filled clay
button: above **5:1**. Verified: `--fg-dim` 9.9:1, `--muted` 5.6:1, clay 4.8:1,
each `--accent-2` ≥ 6:1 on its own ground.

---

## 4. Typography

```css
--font-display: 'Instrument Serif', 'Iowan Old Style', Georgia, serif;
--font-body:    'Outfit', system-ui, -apple-system, 'Segoe UI', sans-serif;
--font-mono:    ui-monospace, 'JetBrains Mono', Menlo, monospace;
```

Google Fonts: `Instrument+Serif:ital@0;1` and `Outfit:wght@300;400;500;600`.
Outfit is already loaded by the current site. Space Mono is dropped.

| Role | Size | Leading | Tracking |
|---|---|---|---|
| Hero wordmark | `clamp(38px, 13.5vw, 290px)` | 1.0 | **+0.06em** |
| Display | `clamp(56px, 9vw, 132px)` | 0.95 | −0.03em |
| H1 | `clamp(40px, 6vw, 76px)` | 1.02 | −0.02em |
| H2 | `clamp(28px, 3.4vw, 44px)` | 1.1 | −0.015em |
| Lede | `clamp(19px, 1.7vw, 26px)` | 1.5 | 0 |
| Body | 17px | 1.6 | 0 |
| Meta / caps | 12px | 1.5 | **+0.1em** |

**Two non-negotiable rules.** All-caps always gets ≥ `0.06em` positive tracking.
Display text ≥32px always gets negative tracking. Skipping either is the most
reliable tell of machine-generated type.

Three weights only: 400 read / 500 emphasize / 600 announce. Body copy capped
at ~62ch.

**Hero wordmark fit.** "YOSEF PILIP" in caps measures ~6.2em in Instrument Serif
and ~6.9em in the Georgia fallback, tracking included. `13.5vw` is the largest
value that keeps one line inside the viewport in *both* faces. Raising it without
re-measuring against the fallback clips the name during font load. At ≤744px it
breaks to two stacked lines at `22vw`, `max-width: 7ch`, rather than shrinking.
The markup must use a **plain space**, not `&nbsp;`, or the mobile wrap never
fires.

---

## 5. Layout posture

- `--r: 8px` — one radius everywhere. 1px borders, never 2px. 8px baseline grid.
- Container: `width: min(1440px, 100% - 2 * var(--gutter))`,
  `--gutter: clamp(20px, 5vw, 88px)`.
- Section rhythm: `padding-block: clamp(72px, 11vw, 168px)`.
- **Asymmetric splits only** — 7fr/5fr or 5fr/7fr, never 50/50.
- **Alternate density.** One tight section, then one that breathes. Never a
  uniform card grid running the length of a page.
- No shadows used as light. Depth comes from image layering and hairlines.
- One fixed full-page grain plate: inline SVG `feTurbulence`, `baseFrequency
  0.85`, 3 octaves, **3.5% opacity**, `pointer-events: none`. The only
  decorative layer in the system.
- Breakpoints to verify with no horizontal scroll: 360 / 390 / 430 / 600 / 744 /
  768 / 1024 / 1366 / 1440 / 1920.

---

## 6. Motion

Exactly two techniques. Lenis wraps both.

### 6.1 Sticky layer parallax

```
.stack          position: relative; height: var(--stack-h)
  .stack-view   position: sticky; top: 0; height: 100svh; overflow: hidden
    .plate      position: absolute; inset: -12% -3%; will-change: transform
                transform: translate3d(0, calc(var(--p) * var(--rate) * 1px), 0)
```

Body stacks set `--stack-h: 240vh`; the Home hero overrides it to `260vh` (§7).

JS writes **one** custom property, `--p` (0 → 1 scroll progress), per in-view
stack. CSS does all the moving. Body stacks use three plates: back image
(`--rate: -90`), copy (`-260`), front image (`-430`). The differing rates are
what slide the copy between the layers.

Rules:
- Animate **only** `transform` and `opacity`. No `background-position`, no
  animating `top`.
- Blur belongs on a child element, never on the transformed parent, or the
  browser re-rasterizes the blur every frame.
- Use `100svh`, not `100vh`, or iOS jumps when the address bar hides.
- Cull off-screen stacks with `IntersectionObserver`.

### 6.2 One-shot reveal

Text blocks fade in and rise 16px once on entry, 0.7s, optional 0.08s stagger,
then **unobserve themselves** so scrolling back up never replays it.

### 6.3 Reduced motion

`prefers-reduced-motion: reduce` → pin `--p` to `0.5`, drop all transforms and
transitions, collapse each stack to a static ~72vh composition with everything
visible. Nothing hidden, nothing moving.

### 6.4 Explicitly excluded

No glow, no bloom, no neon, no gradient used as light, no looping micro-
animations, no pulsing badges, no floating chips. The current site's animated
`eq-bars` and the moving green line effects are removed.

---

## 7. The hero — the site's one signature move

Six depth layers sharing a single `--p`, **Home only**. The wordmark is layer 4:
wide trees behind it, narrow trunks in front of it, fog through both. Because
layer 5 travels faster than layer 4, the trunks slide across the letters as you
scroll — the name moves *in and out of* the trees rather than being statically
chopped by a cutout.

| z | Layer | Source | `--rate` | Mobile |
|---|---|---|---|---|
| 1 | far canopy | `canopy-far.webp` | −60 | −36 |
| 2 | fog bank | CSS | −120 | −70 |
| 3 | wide trees | `trees-back.webp` | −190 | −110 |
| 4 | **the wordmark** | `<h1>` | −250 | −150 |
| 5 | **front trunks** | CSS | −350 | −215 |
| 6 | low fog | CSS | −440 | −270 |

`--stack-h: 260vh`. Intro copy (eyebrow + one line) sits at z-index 7,
bottom-left, **not** parallaxed. A single hairline progress tick fills across the
bottom — no numbers, no badge.

The wordmark is **one real `<h1>`**, not a masked duplicate, so it stays
selectable and reads correctly to screen readers while being physically occluded.

### Front trunks are CSS, not an image

Seven absolutely-positioned dark vertical bars, full height, with per-bar blur:

```
left:  12.5%  24%   35.5%  48%   59%   74%   88%
width: 2.6vw  1.7vw 3.1vw  1.5vw 2.3vw 1.9vw 3.4vw   (clamped 10–62px)
blur:  5px    3px   7px    2px   5px   4px   8px
```

Spacing is **deliberately irregular** — evenly spaced bars read as a barcode,
not a forest. Bars 3 and 6 hide below 744px so the name still reads.

Why CSS: transparent-alpha cutouts are the one thing image models reliably botch
(a faint grey halo kills the illusion), out-of-focus trunks in fog are just soft
vertical shapes, and per-trunk position is tunable in one line against the actual
type. **This also means the hero works with zero images generated.**

Other pages get three-layer stacks. The six-layer hero is never repeated.

---

## 8. Information architecture

### 8.1 Home — `data-room="home"`, jungle floor, sage

1. **Six-layer hero** (§7).
2. **About** — 7/5 split: short prose + spec list (based, school, current role,
   what he's open to).
3. **Thesis stack** — 3-layer parallax on `server-moss.webp`. One line on what
   he actually chases in a problem.
4. **Selected work** — 3 editorial rows: Cache It, Batch Podcast Generator,
   CloudGeometry internal tools → "see all."
5. **Experience** — condensed timeline. **This is where the hardest numbers
   live** and it is the section Overgrowth omitted: $8,000/yr saved, 40 hrs/month
   eliminated, 3 days → same-day, ~100 employees, 400+ attendees, $12,000 budget.
6. **Elsewhere** — three image panels: Build / DJ / Workshop, each linking to
   its room.
7. **Contact** — tinted panel, the one filled clay button.

Experience entries, in résumé order: CloudGeometry (May 2025 – Present) ·
Alpha Epsilon Pi, Events & External Relations Manager (May – Dec 2025) ·
Hillel Business Initiative, Operations & Web Development Lead (Jul – Dec 2025) ·
Tzofim North America, Head Counselor (Aug 2021 – Jun 2024).

Education: SDSU B.S. Computer Science, Aug 2024 – Jun 2028 expected, GPA 3.8 ·
Homestead High School & De Anza College dual enrollment, graduated 2024, GPA 3.8,
Manufacturing Engineering (CAD/SolidWorks, 3D printing, CNC, manual metalwork).

### 8.2 Projects — `data-room="projects"`, ridgeline, slate

Three-layer hero, page head, filter row (All / AI & Automation / Full-stack /
Tools) with live count, then editorial rows.

Order is fixed and intentional:

| # | Project | Slug | Tier 3 at launch |
|---|---|---|---|
| 1 | **Cache It** | `cache-it` | Full case study |
| 2 | **Batch Podcast Generator** | `podcast-generator` | Tier 2 only |
| 3 | **Resell Assistant (MCP)** — in development | `resell-assistant` | Tier 2 only |
| 4 | **CloudGeometry internal tools** | `cloudgeometry` | Tier 2, three sub-parts |
| 5 | **DJ Music Sorter** — being built | `music-sorter` | Tier 2 only |
| 6 | **This site** | `portfolio` | Tier 2 only |

Entry 4 bundles the Slack HR bot, the role-based HR platform, and the Workspace
security auditor into one project with three expandable parts. Listed separately
they read as three small scripts; bundled, they read as *"built the internal
platform for a 100-person company."*

CloudGeometry sitting 4th does bury its metrics on this page. That is accepted
because Home's Experience section carries them above the fold of the visit as a
whole — a recruiter meets those numbers before ever reaching the projects index.

### 8.3 DJ & Music — `data-room="music"`, cave club, orchid

Three-layer cave-club hero, Recursion intro (tech house, summer/dub-leaning
sets; also guitar and piano), the **existing coverflow kept and restyled** into
the new palette, then Connect (`soundcloud.com/recursion-mp3`,
`instagram.com/recursion.mp3`).

The coverflow is working code and is not rebuilt.

### 8.4 Workshop — `data-room="workshop"`, the workbench, ochre

The fourth room, in launch scope. Subject: **making and remaking physical
things** — thrifting, refurbishing, repairing, and reselling across Depop, eBay
and Mercari.

#### The organising device: `RE—`

The page is built on the prefix. Each act is set as display-size `RE—` in
Instrument Serif with only the suffix changing, so scrolling the page reads as
one word repeating and resolving differently:

| Act | Section | What it covers |
|---|---|---|
| **RE·SCUE** | sourcing | Thrifting. What he looks for, what makes a piece worth taking home |
| **RE·NEW** | the work | Refurbishing, repairing, crafts. The before/after evidence |
| **RE·SELL** | letting go | Depop, eBay, Mercari. Pricing, shooting, shipping |

That is also literally an object's lifecycle through his hands, so the device
carries structure rather than decorating it.

Supporting sections, after the three acts:

- **Where the hands came from** — the De Anza manufacturing work: CAD/SolidWorks,
  3D printing across FDM, VAT and powder-bed fusion, CNC machining, manual
  metalwork, parts designed and manufactured end to end. Currently buried as a
  bullet under a high-school entry, and genuinely unusual for a CS applicant.
  This is the section that makes the page a discipline rather than a pastime.
- **The tool he built for it** — a link across to the **Resell Assistant (MCP)**
  project, which finally has the context explaining why it exists.

#### Why this page earns its place

- It reframes the software. Cache It reaches for a wall, a chip and a phone; a
  workshop room shows that reach is a pattern, not a one-off.
- It rescues the manufacturing background from the footnotes.
- It fits the concept. Overgrowth is nature reclaiming tech; refurbishing is the
  same idea reversed — taking something discarded and bringing it back.

#### Photography — the integrity line

Two categories, and they must not blur:

- **Generated: atmosphere only.** The workbench hero scene (`bench-far`,
  `bench-near`). These make no claim about any specific object.
- **The owner's own: all before/after work.** A generated photo of a
  "refurbished chair" would be a fabricated portfolio piece, which is the one
  thing this site does not do. Until real photos exist these slots render
  labeled placeholders at their exact aspect ratios, exactly like every other
  slot.

Before/after pairs are laid out per piece, `--accent-2` labelling the *before*
and bone the *after*. **Two pieces at launch** (supplied 2026-09-12); the grid
takes any number.

Piece 1 runs as a **three-up — before, during, after**. The during frame is the
one that makes the page persuasive: a stripped carcass with a new top being
fitted is evidence of work, where a before/after alone is only a claim.

---

## 9. Projects interaction — three tiers

| Tier | What | Contains |
|---|---|---|
| 1 | Collapsed row | Name, one-line hook, category, year |
| 2 | Expands in place | One paragraph, the stack, two links. **Deliberately short** |
| 3 | Full-page case study | Animated overlay that owns a real URL |

**Tier 2 must stay short.** If it grows long, nobody clicks into tier 3.

**Tier 3 routing.** Clicking through animates the card open into a full-screen
panel with no page reload, *and* pushes `/projects/<slug>` via `history.pushState`.
Pasting that URL cold loads a real standalone page. Back button closes the
overlay. Roughly 30 lines plus a route table — no router dependency.

This matters concretely: Zip Launchpad starts Fall 2026, and being able to send
a mentor or investor `yosefpilip.com/projects/cache-it` and have them land
directly in the case study is the reason tier 3 owns a URL at all.

**Tier 3 left rail** does double duty: jump between projects, and jump between
sections within the current project.

---

## 10. Cache It case study

The flagship. Content from the résumé and the live deployment
(`cache-it-one.vercel.app`), Founder & CEO, Aug 2026 – Present.

Sections:

1. **Head + spec list** — role, dates, stack (React/Vite, FastAPI), live link,
   Zip Launchpad (SDSU startup incubator, starting Fall 2026).
2. **16:9 hero image** — `cacheit-street.webp`.
3. **The problem** — 7/5 split with a tinted "constraints I set" panel.
4. **One three-layer stack** — the only parallax on the page.
5. **The live discovery map** — real-time, geolocation-based area tracking so
   explorers can track down artwork hidden around a city and tap in to collect it.
6. **The collaborator system** — a role that lets outside artists place their own
   artwork independently, decoupling collection growth from core development.
7. **Anti-cheat architecture** — built around iOS/Web NFC constraints, with an
   upgrade path to NTAG 424 DNA chips to keep finds authentic. **NFC, not image
   recognition.**
8. **Screens grid.**
9. **Still open** — honest unresolved design questions, stated as bets rather
   than results.
10. **Next-project band** — the one clay arrow on the page.

---

## 11. Copy

### Voice

Punchy headlines, conversational body. Card titles and hero lines are short and
loud; the writing underneath reads like a person talking, slightly dry, specific.
Numbers appear in the first sentence of anything that has them.

> *"Nobody should have to write a formal email to say they're sick. So now they
> tell Slack in whatever words they'd actually use, and a bot works out what they
> meant, writes it down properly, and goes to find their manager. Three days
> became same-day, for about 100 people."*

**Confirmed by the owner on 2026-09-11:** lighter, less corporate, impressive
and fun. Applies to every page including the Cache It case study — depth of
detail rises there, register does not change.

### Rules

- **Real copy only. No invented metrics.** Every number traces to the résumé.
- Where a value isn't known, ship a short honest `—` plus an HTML comment saying
  what belongs there. An honest dash beats a fabricated stat.
- **All terminal-cosplay copy is deleted**: `Sector_01 // Experience_Log`,
  `NODE_YP`, `STATUS: ONLINE`, `UPLINK_READY`, `SIGNAL_LIVE`, `LOG_001`,
  `BUILD_STATIC // NO_FRAMEWORK`. These are costume, not personality, and they
  are the opposite of the brief.
- Contact email is **`yosefpilip@gmail.com`**.

---

## 12. Images

16 generated slots, plus the owner's own before/after pairs. Every slot is a real `<img>` at its final path. While the file is
missing, the frame shows a labeled placeholder at the exact aspect ratio, so
composition can be judged before spending. Drop the file in and it works — no
code change.

Implementation: a capture-phase `error` listener on `document` (image errors
don't bubble) adds `.is-missing` to the wrapping frame, plus a pass over
`document.images` for any that failed before the script ran.

### Shared prompt lock

So 16 renders read as one shoot: deep desaturated greens, wet black, one warm
clay note. Single soft directional source — overcast or shaft-through-canopy.
Underexposed; shadows keep detail. Photographic 35mm, shallow depth of field,
visible grain. Not illustration, not 3D, not concept art.

**Negative for all:** `neon, glowing, cyberpunk, lens flare, HDR, oversaturated,
vaporwave, text, watermark, logo, CGI render, plastic sheen`

Export WebP, quality ~72. Never ship the raw PNG.

| Path | Size | Room | Role |
|---|---|---|---|
| `canopy-far.webp` | 2400×1600 | home | hero L1 — must stay quiet in the centre third |
| `trees-back.webp` | 2400×1600 | home | hero L3 — vertical rhythm, no subject |
| `server-moss.webp` | 2000×2500 | home | thesis — moss and roots through a server rack |
| `roots-overlay.webp` | 2000×2500 | home | thesis front plate — sparse roots on black |
| `life-build.webp` | 1400×1750 | home | desk, keyboard, one plant leaning in |
| `life-decks.webp` | 1400×1750 | home | mixer in low warm light, no LED glare |
| `life-rack.webp` | 1400×1750 | home | secondhand rack — **the color carrier** |
| `ridge-far.webp` | 2400×1600 | projects | hero back — distant ridgelines in mist |
| `ridge-near.webp` | 2400×1600 | projects | hero front — nearer dark ridge silhouette |
| `cave-far.webp` | 2400×1600 | music | hero back — cave mouth, haze, one light source |
| `cave-near.webp` | 2400×1600 | music | hero front — rock formations, silhouette |
| `cacheit-street.webp` | 2400×1350 | case study | pasted artwork on concrete, ivy beside it |
| `cacheit-scan.webp` | 1600×1200 | case study | hand holding a phone up to a wall |
| `fronds-near.webp` | 2400×1600 | case study | front plate — **needs real alpha** |
| `bench-far.webp` | 2400×1600 | workshop | hero back — bench, tools on a wall, window light |
| `bench-near.webp` | 2400×1600 | workshop | hero front — foreground clutter, clamps, shavings |
| *(before/after pairs)* | 4:5 | workshop | **owner's own photos, never generated** (§8.4) |

`life-rack.webp` is the one slot that should carry real saturation — let the
garments be the brightest thing on the site. That is the honest answer to "the
images provide the color." It doubles as the Home panel pointing at the Workshop
room.

The workshop room bends the lock toward warm interior light — sawdust, raw wood,
window light rather than canopy light. Keep 35mm, underexposed, grain, no neon.

The music room bends it further: a cave club needs
its light source to read orchid rather than overcast green. Keep everything else
(35mm, underexposed, grain, no neon, no flare) identical.

### Generation order — cheapest path to a confident call

1. `trees-back` — the hero's only genuinely required image.
2. `canopy-far` — judge it *behind* `trees-back`, never alone.
3. `server-moss` — the concept image. If this doesn't land, the palette
   conversation reopens, so do not batch it.
4. The three `life-*` panels as one batch (shared prompt skeleton = consistent set).
5. `ridge-*`, `cave-*` and `bench-*` pairs.
6. `cacheit-*` and `fronds-near` last — all below the fold on sub-pages.

---

## 13. Build

### Stack decisions

**Keep:** Vite multi-page build, React 19 islands, Vercel, TypeScript, oxlint.
Every page stays real HTML.

**Add:** Lenis (~3KB gzipped) for weighted smooth scroll. This is the one
dependency that changes the *result* rather than the authoring — Windows mouse
wheels scroll in discrete jumps, and scroll-linked parallax under a jumpy wheel
looks stepped and cheap. Lenis drives native scroll rather than a transform
wrapper, so `position: sticky` keeps working and nothing needs rewiring.

**Rejected — GSAP + ScrollTrigger.** ~70KB gzipped to replace ~40 lines that
already work. ScrollTrigger earns its place on a site with a dozen choreographed
timelines; this has one signature hero and a few three-layer stacks. The `--p`
pattern maps onto `scrub: true` almost line-for-line, so adopting it later is
cheap and not a rewrite.

**Rejected — React Router.** Would require converting a working multi-page build
into an SPA so two React islands can own routing: a large restructure, worse
first paint, and worse SEO on exactly the pages that should be indexed. Tier-3
routing needs `history.pushState` and a small route table.

### Existing islands

- **Flip-board intro** — kept and reused. Recolored to the new palette, with
  imagery behind it (likely the canopy plate at low opacity) so the site feels
  like it is already growing before you arrive. Keeps its once-per-tab-session
  behavior.
- **Coverflow** — kept as-is on the music page, restyled only.
- **NameFlipBoard** — kept in the header, recolored.

### Sequence

1. Token layer, per-room blocks, type scale, grain. Delete the old palette.
2. Home hero (six layers, CSS trunks, zero images required).
3. Home body sections.
4. Projects index + tier-2 expansion + filtering.
5. Tier-3 overlay + `pushState` routing + left rail.
6. Cache It case study.
7. Music page — restyle, cave hero.
8. Workshop page — the `RE—` acts, before/after grid, manufacturing section.
9. Images generated and dropped into existing slots.
10. Accessibility, reduced-motion, and breakpoint pass.

---

## 14. Open items — ship as `—`, never invent

### Supplied 2026-09-12

- **Depop** — `depop.com/explosef`.
- **Workshop photography** — two real pieces, converted and committed to
  `assets/img/workshop/`. Piece 1 (low cabinet, spindle doors) has a
  **before / during / after** set; piece 2 (side cabinet, open shelves) has
  before / after plus detail shots. The mid-process frame is the strongest of
  the nine: it shows the carcass stripped with the new top being fitted, which
  evidences the work rather than only the result.

### Closed by decision

- **"Based in" city** — the owner has declined to publish one. The row is
  **removed** from Home's spec list rather than shipped as a dash; a dash
  implies a value is coming, and none is.

### Still open

- **DJ Music Sorter** — one line on what it sorts and by what. Being built in a
  separate session, so this will close on its own.
- **eBay and Mercari** — handles and links. Depop ships alone until they arrive;
  the other two are the only dashes left on the Workshop page.
- Mix archive link beyond SoundCloud; residencies, if any.

---

## 15. Definition of done

- [ ] Every color literal lives in `:root` or a `[data-room]` block. Zero
      hardcoded hex elsewhere.
- [ ] Clay appears only on clickable things, and stays rare — ≤2 visible uses per screen. The
      room's `--accent-2` is an identity colour, not a signal, and is not counted; it should
      appear a few times per screen rather than once.
- [ ] Ochre vs clay checked visually wherever both appear (§3.2).
- [ ] All-caps ≥ `0.06em` tracking; display ≥32px has negative tracking.
- [ ] Hero wordmark fits on one line at 1440px **in the Georgia fallback too**.
- [ ] No horizontal scroll at any breakpoint in §5.
- [ ] `prefers-reduced-motion` collapses both techniques; nothing is hidden.
- [ ] Only `transform` and `opacity` animate. Lighthouse not regressed.
- [ ] `/projects/cache-it` loads correctly as a cold URL, and the back button
      closes the overlay.
- [ ] Every number on the site traces to the résumé. Zero invented metrics.
- [ ] No generated image is presented as a real refurbished piece. Workshop
      before/after photos are the owner's own or a visible placeholder (§8.4).
- [ ] No `Sector_`, `NODE_`, `LOG_`, `UPLINK_`, or `SIGNAL_` strings remain.
- [ ] Nothing from §6.4 present.
- [ ] Every unknown is a visible `—` plus an HTML comment, never a fabrication.
