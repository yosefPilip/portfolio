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

An ammonite — a fossil spiral — frozen in glacial ice. It lifts out of the wall,
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
notch 0-2    glacial chamber, cold and still, violet-blue translucence.
             An ammonite sits frozen in the ice wall, off centre.
             <h1>Recursion</h1> over it.

notch 2-7    the shell releases from the wall, drifts to centre, and
             begins to turn. The chamber dims and desaturates behind it
             so the spiral is unambiguously the subject.

notch 7-9    mid-rotation cross-fade. The whorl becomes a brushed
             platter; the chamber walls become radial grain; a violet
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

| slot | tier | what |
|---|---|---|
| `ammonite` | 3 real alpha | the shell alone on transparent ground, square-on, centred |
| `ice-chamber` | 1 opaque | the held scene, with the shell frozen in the wall |
| `jog-wheel` | 3 real alpha | the platter alone, square-on, centred |

**Generation order is load-bearing.** The owner chose *embedded in the ice, then
lifts out*, which means the shell exists twice — loose, and frozen in the wall —
and there is **no seed**. So:

1. Generate `ammonite` **first**, loose on transparent ground.
2. Generate `ice-chamber` with `--ref` on that file, so the fossil in the wall is
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
1%). `ice-chamber` carries the title band and is measured against bone for
contrast the way every opaque plate is. Both discs are additionally gated on
**circularity and concentricity** — the bounding box must be square to within 2%
and the centroid within 1% of the box centre, or the cut will wobble as it turns.
A new `tools/disc.py` does that measurement, in the same family as
`tools/doorway.py`: numbers re-derivable from the file, never eyeballed.

*Palette.* Violet-blue ice throughout, never white. Projects already owns snow —
an exterior, distant, slate-grey ridgeline — and this room must not read as the
same material. If the ice ever reads white it is wrong. Saturated violet also
keeps it clear of the glowing-ice-cave stock trope.

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

## 9. Open — the owner's to settle

**The copy.** The hero currently reads *"A name that bridges software and
sound."*, written before the page had a spiral in it. It is unchanged in this
spec and will ship unchanged unless the owner says otherwise. Whether the moment
the shell becomes the deck carries a line of its own, or no words at all, is
also his call. He writes his own copy; nothing here drafts a replacement.

**Spend.** Three explore rolls, roughly **$0.05**, plus possibly one final for
`ice-chamber`. Per CLAUDE.md §7 a costed slot list goes to the owner and waits
for a yes before anything is generated, and then one image at a time.
