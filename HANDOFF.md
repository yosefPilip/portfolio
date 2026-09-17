# Handoff — Projects hero (`#ridge`)

Read `CLAUDE.md` first, then this. This file is the state of one unfinished task and an
honest account of how the previous session wasted the owner's time on it.

---

## 1. Read these before touching anything

| Path | What it is |
|---|---|
| `docs/superpowers/specs/2026-09-17-hero-rooms-motion-and-images-design.md` | The spec. §4.1 (Projects) is the part that is wrong — see §4 below. |
| `docs/superpowers/plans/2026-09-17-hero-rooms-motion-and-images.md` | The 10-task plan. Tasks 1, 2 are done and reviewed. Task 3 is in progress. |
| `.superpowers/sdd/2026-09-17-hero-rooms-motion-and-images/progress.md` | Ledger: every ruling made, including two that were wrong and retracted. Gitignored. |
| `docs/image-slots.md` | Per-slot spend and the two standing lessons learned in this sitting. |

Branch `portfolio-overgrowth-rebuild`. Last commit `79724a6`.

---

## 2. State

**Done and approved by the owner — do not touch:**

- **`ridge-far` (back plate).** He said: *"back looks good keep it."* It is
  `assets/img/roll-far-06.png` → `assets/img/ridge-far.webp`. A bright snowy alpine
  range with a bare rock cliff spanning 36–64% of the height, which is what the `h1`
  and the lede sit on. It has NOT been rendered at final tier yet — $0.32 remains
  approved for that whenever the front plate is settled.
- **Tasks 1 and 2** (depth guards generalized; `#ridge` four-plate scope with the CSS
  haze). Both reviewed clean.

**Not done — the whole problem:**

`ridge-near` (front plate). The owner has flagged the same defect **four times** and it
is still not fixed.

**Known baseline:** `npm test` has exactly one pre-existing failure,
`tests/workshop-page.test.ts > references all four arrival image slots`, caused by the
owner's own uncommitted work. 554/555 pass. Do not "fix" it; Task 8 replaces it. Any
*second* failure is yours.

---

## 3. What the owner actually asked for

Quoted, because paraphrasing it is how the last session went wrong.

> "the front mountain piece had a big gap under it, this shouldnt be the case for the
> final images. The front mountain should look good and clean hd fit with the back ones,
> should extend all the way to the bottom of the hero image section, and should slide
> over the project name upon scroll."

> "front layer mountain is see through for some reason, it shouldnt be, title should
> fully dissaper behind it"

> "Front moving image should follow the same design it has now, except it should be much
> much bigger and taller, should extend all the way down to the end of the hero and
> should sit right under the title as it does now."

> "The front plate no covers the subtitle fully, upon scroll it is still extremly short
> to wejre ou can see the back plate under it."

> "remeber the subtitle too, its not visible now"

Four requirements, all simultaneous:

1. At rest, the ridgeline sits **below the whole copy block** — the `h1` *and* the lede.
   Covering the lede is a failure. It has been a failure three times.
2. The plate is **opaque**, not a blend. The title disappears behind it completely.
   This is why the slot is Tier 3 real alpha, overriding the spec's Tier-3 ban (that ban
   was written against fine foliage; a ridge is a hard edge, and the matte measures
   ~0.4% partial pixels, which is clean).
3. It **reaches the bottom of the hero at every scroll position** — no gap, no floating
   strip, no straight edge.
4. By the end of the runway the back plate is **completely buried**.

---

## 4. The actual defect, with the algebra

**This is not an image problem. Stop re-rolling pictures.** The previous session burned
eleven rolls partly on this.

`src/styles/stack.css`:

```css
.plate { inset: -12% -3%; transform: translate3d(0, calc(var(--p) * var(--rate) * 1px), 0); }
.plate > .frame { width: 100%; height: calc(100% - var(--rate, 0) * 1px); }
.plate img { width: 100%; height: 100%; object-fit: cover; }
```

The frame is `100% + |--rate|` tall and `object-fit: cover` scales the source to fill it.
So the ridgeline's position is a **fraction of a frame that grows exactly as fast as the
travel**. Writing `g` for the ridgeline's fraction of the source, `V` for viewport
height and `R` for `|--rate|`:

```
ridgeline_y(p) = -0.12V - R*p + g*(1.24V + R)
```

The `+g*R` term eats the `-R*p` term. Raising `--rate` to bury the back plate also
magnifies the image by the same factor, which is what repeatedly produced an unreadable
close-up of snow. There is no value of `--rate` alone that satisfies requirements 1 and 4
together with a 3:2 source.

**Three fixes were tried and all failed. Do not repeat them:**

| Attempt | Result |
|---|---|
| Raise `--rate` to 1200 | Source magnified 2.3×. Wall of snow. |
| Mirror-tile the rock downward to make the source tall | Geometry passed at four viewports; render was a visible kaleidoscope. |
| Portrait source (1024×1536) | `cover` then scales by **width** — 1.49× upscale, worse. The source must be **wider in pixels than the frame**, not just taller in aspect. |

**The direction that was working when the session ended:** a source whose aspect is close
to the frame's *and* whose pixel width exceeds the frame's, so `cover` scales **down**.
`assets/img/roll-near-07.png` is 2048×2736 (aspect 0.749), peak at 0.305, full-width
coverage at 0.383, **spread 0.079** — the best silhouette produced, a genuinely even
ridgeline. At `--rate: -1500` the frame is 2616px at V=900 and `cover` scales it 0.96×,
i.e. no magnification. That part works.

**What was still wrong at handoff:** at the end of the runway the frame shows the base of
that massif, which is smooth snow slopes with no ridge detail — it reads as a close-up
even though it is not magnified. The current `--rate: -1500 / -1200` is committed but
unverified against the owner's eye.

**The option nobody has tried, and probably the right one:** stop using the shared
`.plate > .frame` height rule for this plate. Give it its own box anchored to the bottom
of the sticky view, sized `calc(100svh + <travel>)`, with the image at natural scale. Then
the ridgeline's position is an absolute offset instead of a fraction, `-R*p` is not
cancelled, and the geometry is solvable without a giant rate. `tests/plate-coverage.test.ts`
asserts the shared rule, so it needs a scoped exemption with a comment saying why.

---

## 5. How the last session wasted the owner's time

He asked directly what information he needed to provide. The honest answer was: almost
none — the failures were verification failures, not information failures.

1. **Reported success from measurements without looking at the render.** Said "BACK FULLY
   BURIED at four viewports" when the render was a kaleidoscope. Did this more than once.
   **Look at the screenshot before making any claim.**
2. **Deleted files as cleanup.** Destroyed both of his reference images (untracked,
   unrecoverable — he had to re-upload them) and a generated back plate he liked
   (`rf-a`, gone for good). **Never delete or overwrite a generated image. Every roll
   gets its own `assets/img/roll-*.png` and stays.**
3. **Overwrote his panel crops** on a claim — "these slots no longer exist" — that one
   `git grep` disproved. **Never touch `src/styles/layout.generated.css`** except to
   remove a structural declaration a task explicitly relocates.
4. **Generalized a local note into a global change.** He said the title was hard to read;
   the session graded the entire image dark. When he corrects something, establish
   whether it is that spot or the whole image.
5. **Bundled changes**, so a thing he liked disappeared inside a batch he had not asked
   for. One change at a time, shown to him.

Also worth knowing: **his visual editing panel re-applies a band trim**
(`height: 53%; top: 47%`) to the front slot when he drops an image. That trim makes the
plate a floating strip whose hard edges sweep through the frame — it was the original
cause of the "big gap under it" he first reported. It is currently absent from
`layout.generated.css` but will return if he re-drops. **A guard test for this was
specified and never written; write it.** It should parse the page HTML for
`.plate > .frame[data-label]` and fail if `layout.generated.css` gives any of those
labels a `height` or `top`.

---

## 6. Spend

Approved: ~$0.40 for Projects, ceiling $1.55 for the whole plan. Spent so far this
sitting: **~$0.14** across eleven explore rolls. The $0.32 `ridge-far` final is approved
but unspent. Every roll must be logged to `docs/image-slots.md` with its cost, failures
included. One image at a time, never a batch, per `CLAUDE.md` §7.

---

## 7. First things to do

1. Read §4. Do not re-roll an image until the geometry is solved.
2. Open `scratchpad/v-1440-end.png` and `scratchpad/v-1920-end.png` — end-of-scroll at two
   viewports with what is currently committed — and form your own view of whether the
   base of the massif reads acceptably.
3. Propose the scoped frame-rule change to the owner **before** implementing it. He is out
   of patience for guesswork; a short written proposal with the geometry in it is worth
   more than another attempt.
4. Write the band-trim guard.
