# Music — the spiral and the deck

Date: 2026-09-17
Supersedes: spec §8.3's "three-layer cave-club hero" and §4.2 of
`2026-09-17-hero-rooms-motion-and-images-design.md` (Music — the cave).
The coverflow is untouched by both.

---

## 1. The problem this solves

The owner, on the room as it stands: *"it seems a little dark for me and boring.
It's supposed to be a DJ and music page, should be unique and as cool as the
workshop page."*

Dark is not the fault. **Static is.** The cave hero is one photograph with three
plates drifting over it; nothing happens, nothing arrives, and there is no reason
to keep scrolling. Workshop works because you *go somewhere* — there is a
destination, one warm light telling you where it is, and a payoff at the end.

But this page also has a job the Workshop page does not. Measured on the real
pages at 1440x900, driving with real wheel events:

| page | stack | notches to first content |
|---|---|---|
| Projects | 1350px | **9** — the owner's benchmark |
| Music (today) | 1620px | **10** |
| Workshop (the dolly) | 2340px | **18** |

The owner: *"is this doing too much for a page that I might use for getting
bookings or showing to venue owners?"* He is right, and the number says so. A
three-pass version of the doorway dolly was scoped at roughly **50 notches** —
five times the Projects benchmark, and about half a minute of scrolling before a
promoter hears anything. **Rejected on time-to-content, not on taste.**

**This spec targets ~11 notches to content** and spends the whole budget on one
moment instead of three.

---

## 2. The idea

An ammonite — a fossil spiral — frozen in a wall of blue ice. It lifts out,
centres, turns, and **becomes a jog wheel**.

Why this and not a prettier cave: the ammonite is a logarithmic spiral, chambered,
each chamber a scaled copy of the last. It is self-similarity as a physical object.
The room is called **Recursion**. The alias stops being a caption on the page and
becomes the mechanic of the page — which is the "could not have come out of any
builder" bar the project exists to clear.

It also earns the DJ half honestly. A platter is a loop that returns to where it
started. Cutting from an ancient recursive form to the thing the owner actually
does, in one rotation, is the whole nature-meets-nightlife brief in a single edit
rather than a themed backdrop.

---

## 3. The move

The scene is HELD. Only the sticker turns. The copy never rotates.

```
notch 0-2    a face-on wall of deep blue transparent ice, cold and still.
             An ammonite imprint sits frozen inside it, off centre.
             <h1>Recursion</h1> over it.

notch 2-7    the imprint releases from the ice, drifts to centre, and
             begins to turn. The ice dims and desaturates behind it
             so the spiral is unambiguously the subject.

notch 7-9    mid-rotation cross-fade. The whorl becomes a brushed
             platter; the fossil's ribs become the dimpled rim; a violet
             ring lights the rim. Both layers are turning at the same
             rate through the swap, so it reads as one object changing
             rather than two pictures dissolving.

notch 9-11   the deck settles level and comes to rest. Mixes are
             already on screen.
```

**Owner's ruling: the platter settles and scrolls away.** It does not persist
behind the rest of the page. The transformation is a single moment, witnessed
once, and the content below gets a clean field.

---

## 4. Mechanism

Nothing here is a new primitive. Rotation is a `transform`, so it passes the
animation guard unchanged, and the whole move is `--p` driving `rotate()` and
`opacity` — the two properties the site already allows.

```css
/* both layers share one angle, so the cut cannot slip */
--spin: calc(var(--p, 0) * 300deg);
```

**The match cut lives or dies on three shared values:** centre, diameter, and
angle. Those are held in CSS, not hoped for — the same discipline that made the
doorway seat correctly. The shell and the platter are positioned from one set of
custom properties so they cannot drift apart when a viewport changes.

**Rotation legibility, which decides whether this is elegant or nauseating:**

- Perfect radial symmetry is **invisible** — a shape with no asymmetry cannot be
  seen to rotate at all.
- Evenly spaced high-contrast radial spokes **strobe**, like a wagon wheel.
- The sweet spot is concentric or spiral structure plus one asymmetric mark.

A logarithmic spiral is the ideal case: one unmistakable direction of travel,
nothing periodic to alias. This is also exactly how a real jog wheel is built —
smooth platter, ring of light, one position marker — which is *why* the rhyme
works and is not a coincidence to be discovered during implementation.

**`prefers-reduced-motion`:** `handle.lenis` is null and no Lenis instance is
constructed, but the rAF loop still writes `--p`, so the move degrades to native
scroll and remains correct. A rotating element is nevertheless the most likely
thing on this site to bother a motion-sensitive reader: under reduced motion the
spin is **capped at 30deg total** and the cross-fade carries the change instead.

---

## 5. Images — three slots

| slot | tier | size | what | reference |
|---|---|---|---|---|
| `ammonite` | 3 real alpha | 1024x1024 | the fossil imprint alone on transparent ground, square-on, centred | `Fossil.jpg` |
| `ice-plane` | 1 opaque | 1536x1216 | the held scene: a face-on wall of blue ice with the imprint frozen in it | `ICE.jpg` + the `ammonite` roll |
| `jog-wheel` | 3 real alpha | 1024x1024 | the platter alone, square-on, centred | `ref-jogwheel.png` |

**The owner supplied all three references, and they changed the scene for the
better.** `ICE.jpg` is a flat plane of cracked blue ice seen FACE-ON, not a cave
interior — and that is the stronger stage. A held flat plane does not compete
with the spinning disc for attention, the way a deep chamber would; the imprint
sits flat so the shell lifts straight out toward camera rather than out of a wall
at an angle; and it avoids the glowing-ice-cave stock trope entirely. **The scene
is therefore a wall of deep blue transparent ice, lit from behind, not a
chamber.** This supersedes "glacial chamber" everywhere above.

`ref-jogwheel.png` is a square platter-only crop taken from the owner's
`CDj.webp` (a Pioneer CDJ-3000, whole unit) so the model is shown the wheel and
not the deck. Keep from it: the dimpled outer ring, the chrome bezel, the flat
dark platter, the small centred hub. Drop: every piece of branding and lettering,
and the multicolour centre display, which becomes the violet ring instead.

`Fossil.jpg` and `ICE.jpg` both carry stock watermarks. They are references only,
are never referenced by a built page, and are **not deleted** — Ruling 10.

**Generation order is load-bearing.** The owner chose *embedded in the ice, then
lifts out*, which means the shell exists twice — loose, and frozen in the wall —
and there is **no seed**. So:

1. Generate `ammonite` **first**, as an imprint on transparent ground.
2. Generate `ice-plane` with `--ref` on that file, so the fossil in the ice is
   the same fossil. This is the `cottage-face` lesson: `--ref` on
   `cottage-far.webp` is what made the facade read as the same building.
3. Generate `jog-wheel` last, matched to the shell's diameter and whorl direction.

**`jog-wheel` must be prompted tight and abstract: platter only, brushed metal,
radial grain, violet ring light — no text, no buttons, no logos, no brand.**
Image models garble small lettering, the site bans baked-in text outright, and a
recognisable branded CDJ is both a legal question and a worse picture. This is a
constraint that improves the image, not a compromise.

*Gates.* `ammonite` and `jog-wheel` go through `tools/whitepoint.py --alpha` and
must reach the matte quality `ridge-near` shipped at (partial alpha well under
1%). `ice-plane` carries the title band and is measured against bone for
contrast the way every opaque plate is. Both discs are additionally gated on
**circularity and concentricity** — the bounding box must be square to within 2%
and the centroid within 1% of the box centre, or the cut will wobble as it turns.
A new `tools/disc.py` does that measurement, in the same family as
`tools/doorway.py`: numbers re-derivable from the file, never eyeballed.

*Palette.* Deep blue transparent ice with white fracture planes, per the owner's
reference — never white overall, and never a pale glacier. Projects already owns
snow (exterior, distant, slate-grey), and this room must not read as the same
material; saturated blue at close range is what separates them.

**The orchid lives in the LIGHT, not in the ice.** The ice keeps its natural blue
in the photograph; violet arrives as the glow behind the fossil, the platter's
ring, and the UI accent. That is the site's standing rule — colour in the images,
accent in the chrome — and it is also simply what lit ice looks like. Do not
prompt the ice itself violet.

---

## 6. Page order

**Owner's ruling: the arrival lands straight into Mixes.**

```
before:  hero -> about-music -> mixes -> connect
after:   hero -> mixes -> about-music -> connect
```

A promoter hears a set within ~11 notches instead of reading a screen of prose
first. The writing is not cut — it moves below the work it frames.

`tests/music-page.test.ts` asserts the room, the coverflow mount, the three-layer
hero, the real links and the banned-copy sweep. The reorder touches none of those
directly, but the suite must gain an explicit assertion that `#mixes` precedes
`#about-music`, or the ordering is unprotected and a later edit can silently undo
the one change a promoter actually benefits from.

---

## 7. Out of scope

- **The coverflow is not rebuilt.** It is working code. Spec §8.3 already says so
  and nothing here changes it.
- **No images below the hero.** Owner's ruling: typography, spacing and the
  orchid accent only. The lower page gets attention, not new slots.
- **No doorway dolly on this page.** Explicitly rejected on time-to-content.
- **No page rotation.** Only the disc turns; the frame stays level and the copy
  stays readable.
- `cave-far.webp` and `cave-near.webp` are superseded but **stay on disk** —
  rolls are never deleted, and they are the fallback if this move does not land.

---

## 8. Risks

| risk | gate |
|---|---|
| The two shells do not match | `--ref` chaining, and the scene is re-rolled rather than graded if the fossil differs |
| The disc wobbles as it turns | `tools/disc.py` circularity + centroid check before either disc ships |
| The cut reads as a dissolve, not a change | both layers share one `--spin`; cross-fade window tuned against filmstrip output, not chosen |
| `jog-wheel` comes back with garbled text | prompt forbids all lettering; any roll with text is rejected outright rather than retouched |
| Rotation bothers a motion-sensitive reader | spin capped at 30deg under `prefers-reduced-motion` |
| It reads as a gimmick | the spin is slow, happens once, and resolves into content; measured at ~11 notches |

**The standing lesson from the Workshop sitting applies here more than anywhere:
passing every measured gate is not the same as looking right.** Three separate
faults that session — the raster-layer blur, the inherited `aspect-ratio`, the
door's transparent margin — measured perfectly correct and looked wrong. Every
beat of this move gets looked at in the page before it is called done.

---

## 9. Built so far, and where it diverged from the above

The first beat is on the page: the ice plane as the background, the ammonite
centred on it, the title over it. Three layers — `plate--back`, `plate--disc`,
`plate--copy` — with the disc deliberately BETWEEN the ice and the copy so the
title reads over the spiral rather than the spiral covering the title. The
rotation and the match cut are not built yet.

**Two owner-directed divergences from §3 and §5, recorded because the spec is
otherwise now wrong:**

1. **The fossil is ICE, not stone.** The first roll came back as pale
   limestone, per the reference. The owner: *"it should be part of the ice,
   the ammonite shape should be imprinted into the blue ice... the limestone
   seems a little out of place in that scene."* Re-rolled with the limestone
   roll as `--ref` so the geometry survived and only the material changed:
   warmth went from +16 to **-110.7** R-B, and the disc still gates clean
   (aspect 0.996, centroid 0.499/0.500, matte 0.42% partial).
2. **The fossil is FROZEN INTO the plane after all** — §5's original call,
   arrived at the long way. It shipped first as a separate centred sticker
   over a clean plane, and the owner named exactly what that looked like:
   *"it looks like it was placed onto the ice... I want it to look like one
   with the ice, add some more cracks and texture all over the background and
   near it, it should match the background almost."* The smooth quiet centre
   composed for title contrast was itself what isolated the fossil.

   Re-rolled with TWO references — the previous plane and the ammonite cutout
   — so one image carries both: bigger, centred, with cracks running across
   the spiral and out the other side so the fossil and the ice are visibly one
   surface that fractured together. Title-band contrast paid 12.96:1 -> 9.80:1
   mean (4.02:1 at p95) for the texture, still well clear of the 3:1 display
   floor, and centre detail roughly doubled (std 17 -> 36). Composited, the h1
   reads **14.38:1** and the lede **8.00:1**, both better than before.

   `.plate--disc` stays in the markup carrying the free-standing cutout, at
   `opacity: 0`. It is the next beat, not dead markup: as the scroll starts it
   fades in over the embedded fossil at the same centre and begins to turn —
   the spiral releasing from the ice, which is what §3 always described. Its
   layer order is settled now so the spin does not have to restructure
   anything later.

**A third change was made and then REVERTED, which is worth recording.** While
the fossil was a bright sticker, the lede measured only 3.47:1 over it against
the 4.5:1 body-text floor, so it was moved below the disc and pinned to
`calc(50% + var(--disc-size)/2 + ...)`. (The first attempt at that used a
multiplier tuned at 1440x900 which overlapped at 390x844 and 744x1000 — one
number tuned at one viewport. Pinning it to the disc's own radius fixed it,
24-32px clear at five viewports.) Embedding the fossil made all of it moot:
the spiral is now dark blue ice rather than a bright cyan disc, so the lede
sits back under the title in normal flow and measures 8.00:1. The absolute
positioning is gone. **Noted because it will look like an obvious thing to
re-add if the disc is ever brightened again — and then it will be needed.**

**Known trade:** the plane's bright fractures are deliberately concentrated at
the frame edges to keep the centre quiet for the title, and at 390x844 only
the centre ~31% of the source survives the cover crop — so the mobile
background is plainer than the desktop one. Judged acceptable: the spiral is
the subject and the copy is legible. Pulling fractures inward would busy the
title band on desktop, which is the worse trade.

---

**The spin and the match cut are built.** Both discs carry one `--spin`, sit on
one centre, and `tools/disc.py` measured their diameters as matching to within
**0.1%**, so the cut needed no correction at all. 300deg rather than a full
turn: 360 lands back where it started and reads as nothing having happened.

**SUPERSEDED — the pull-back is gone; see below.** The pull-back did double duty. The embedded fossil renders about 1111px
across at 1440x900 — wider than the viewport is tall — and the owner flagged it:
*"I feel like the fossil a little too big especially for transition."* Rather
than shrink it, the free disc fades up at 2.45x and settles to 1.0 across the
release, so the frozen pattern in the wall resolves into something hand-sized.
The size he objected to is what the move now spends.

Two corrections made in the browser, neither visible in a still:

- **The disc carries no `--rate`.** It had -170, which drifted it upward while
  the copy drifted faster, and at --p 1 it had climbed behind the title instead
  of coming to rest. It is the subject and it settles, so it does not parallax.
- **The copy hands over.** It is readable over the frozen spiral at rest, which
  is what the layer order is for — but by the end it lay across the platter. It
  now clears by --p 0.46 and lets the deck finish alone.

**`--stack-h` is 220vh and time-to-content measures 14 notches**, against the
~11 this spec targeted and the 18 the Workshop dolly costs. The extra runway is
what stops the transformation feeling rushed. Still 4 notches under Workshop and
the page now carries a full transformation rather than a static hero; if 14 is
judged too long, trimming to ~190vh returns roughly 12.

---

**The BACKGROUND turns into the deck, which is not the same thing as a disc
appearing over it.** The owner: *"I want the actual background to change into
the CDJ scroll wheel. Right now you put on the other sticker. So make the
background smaller, but also make it fit with the background."*

Shrinking the embedded fossil made the pull-back unnecessary and the illusion
far stronger. The fossil in the plane is now a modest medallion rather than a
frame-filling pattern, and the cutout lands on it **exactly**, so the fade-up is
invisible and what you watch is the ice itself beginning to turn.

`--disc-size` is therefore MEASURED, not chosen. An angular-roughness sweep puts
the embedded fossil at **348px across in a 1536x1216 source** (28.6% of its
height); the plane is cover-fit, so its on-screen diameter is
`348 x max(1.06vw/1536, 1.24svh/1216)`, which folds to `max(24.02vw, 35.49svh)`.
Verified in-browser: **0px delta at 1280x800, 1920x1080, 390x844 and 744x1000.**

The plane also dims far less now (0.3 rather than 0.55) — the embedded fossil is
hidden UNDER the cutout instead of competing beside it, so the ice only has to
recede, not get out of the way.

**The wheel was re-rolled: the first one was cartoony and read as a side view.**
Its dimples were shaded like spheres and the hub was beveled, which together
implied a camera off the axis. The second roll is prompted as a photograph
rather than a render — orthographic from directly overhead, no side wall or
outer casing visible anywhere, shallow dimples with only faint even shading,
and real wear (micro-scratches, uneven anodising, dust, the dulling of a
surface touched thousands of times). Violet blended onto orchid at distance
**22**. Gates: aspect 1.003, centroid 0.500/0.500.

---

## 9b. The payoff — the deck, and the information

The owner, on the version that stopped at a spinning wheel: *"there's still no
transition, that's just a cool animation. I need it to somehow transition into
the rest of the page."* He was right — the move ended nowhere. Workshop works
because it delivers you somewhere and the headline is waiting.

So the wheel now assembles into a full deck, and the page's essential
information arrives with it:

```
--p 0.00-0.10   dark blue ice, the fossil dead centre, part of the ice
--p 0.10-0.52   the fossil lifts free and turns, becoming a jog wheel
--p 0.40-0.72   the wheel resolves; the spin eases to a stop
--p 0.54-0.80   the deck body grows AROUND the still-turning wheel, and the
                whole assembly eases back so the finished unit fits the frame
--p 0.76-0.92   RECURSION behind, and ALIAS / SOUND / ALSO / FIND ME below
```

**The deck grows around the wheel rather than replacing it.** One less morph to
get wrong, and the thing that was the fossil never stops being the thing you are
watching.

**The spin lands on exactly 720deg, and that is a requirement rather than a
detail.** The owner's logo rides on the platter, so the wheel has to come to
rest with the mark upright; any angle that is not a multiple of 360 leaves it
tilted forever. It is eased out (`1-(1-t)^2`) and finishes at --p 0.72, so there
is a stretch where you are simply looking at a finished deck.

**Three numbers place the deck, all measured.** Its violet ring is 0.4622 of its
width and the wheel's is 0.825 of its own, so the wheel renders at 0.5603 of the
deck width — the deck is `--disc-size x 1.7848`. Its wheel centre sits at
46.27% / 61.45% of its box, which is both the offset and the transform-origin,
so the pull-back pivots on the wheel instead of sliding the deck off it.
Verified to fit the viewport at 1280x800, 1440x900, 1920x1080 and 390x844.

**The logo is the owner's own mark**, keyed off its black ground and composited
onto the platter face at 46% of the wheel's diameter — sized like a record
label, because in the hub its circling RECURSION text would be illegible. Tinted
to the wheel's own icy highlight rather than pure white.

**The deck is built from this room rather than dropped into it.** The previous
wheel was charcoal and magenta on blue ice and read as two different worlds. Both
the wheel and the deck are now blue-black (mean RGB 25/34/54 against the plane's
6/39/76), lit as though lying on lit ice, violet restrained to a ring and a few
pads. Clay proximity: **0.000%** of the deck within 60 of `#cf6b3e`.

**The information moved rather than being copied.** The `Alias / Sound / Also`
list and the links are lifted OUT of the sections below into the hero, so a
promoter gets the name, the sound and where to hear it before scrolling at all.
The prose stays below the work it frames. A first attempt duplicated the list
instead of moving it and `tests/dataEdit.test.ts` caught the repeated ids.

---

## 9c. The rebuild that made it read

Four faults, all named by the owner, all real:

**1. "We're still using the sticker of the fossil."** The cutout was the old
bright cyan disc while the fossil in the plane was dark and subtle, so a
brighter, harder-edged thing appeared out of nowhere. Re-rolled FROM the plane
itself: the cutout now measures **7 RGB** from the fossil in the ice, against
**127** before. Matched, it stops looking applied and simply detaches.

**2. "The CDJ is off-center, and the jog wheel is slightly off-center."** The
deck had been pinned by its WHEEL, which put the wheel on the viewport centre
and the deck body visibly to one side. The deck is now centred, full stop — and
because the deck's wheel seat is not at the deck's centre (46.27% / 61.45% of
its box), the wheel has to TRAVEL into it as the deck assembles: -0.0666 and
+0.2427 of `--disc-size`. Measured, not nudged. Deck centre now lands on the
viewport centre to the pixel at 1280x800, 1440x900 and 1920x1080.

**3. "The name Recursion is very opaque, you can't even see it."** It was 9%
opacity in the dead centre, behind the deck, where it was invisible. It is now
large at the TOP of the frame at 40%, behind the deck. `top: 18%` rather than
10%: the plate is inset -12%, so a percentage is measured from above the
viewport and 10% put the cap-height under the site header.

**4. "On the sides you can have information about me, because right now it's
below and it's covered."** The list moved from under the deck to two columns
flanking it. Below 1000px there is no room beside the deck, so they drop under
it and the deck eases back further (0.44 rather than 0.28) to leave room —
and `bottom` there is `calc(12% + 4vh)`, because the plate's -12% inset puts
its bottom edge below the viewport and a bare `4vh` pushed them off-screen.

**The ice falls away.** `.plate--void` sits behind everything with a violet
radial over `--bg-deep`, and the ice plane fades out across --p 0.56-0.78, so
the deck ends on the dark violet ground the owner asked for rather than on a
photograph it has nothing to do with.

**Tracking guard, twice.** It reads each RULE, not the rendered text — so a
media-query override that restates `font-size` above 32px without restating
`text-transform: uppercase` reads as normal-case display type and demands
negative tracking. Both `.word` rules declare it.

---

## 10. Open — the owner's to settle

**The copy.** The hero currently reads *"A name that bridges software and
sound."*, written before the page had a spiral in it. It is unchanged in this
spec and will ship unchanged unless the owner says otherwise. Whether the moment
the shell becomes the deck carries a line of its own, or no words at all, is
also his call. He writes his own copy; nothing here drafts a replacement.

**Spend.** Three explore rolls, roughly **$0.05**, plus possibly one final for
`ice-plane`. Per CLAUDE.md §7 a costed slot list goes to the owner and waits
for a yes before anything is generated, and then one image at a time.
