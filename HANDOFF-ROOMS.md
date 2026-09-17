# Handoff — the Music (Recursion) and Workshop rooms

Read `CLAUDE.md` first, then this. `HANDOFF.md` is the *previous* task and is now
closed; read it only for the lessons in §5, which still apply.

Branch `portfolio-overgrowth-rebuild`, last commit `9a1a754`. **Never pushed — the whole
branch is local.** Do not push, do not deploy.

---

## 1. What is left

| Room | Slot | State | What it is |
|---|---|---|---|
| Music | `cave-far` | **placeholder** — `20740152436-12f8b92839-b.jpg` | back plate. A photo the owner dropped in; upload filename, never graded. |
| Music | `cave-near` | **missing** | front plate. Renders as the labelled dashed box. |
| Workshop | `cottage-far` | **placeholder** — `images-2.jpg` | back plate, exterior. Same story. |
| Workshop | `needles-near` | **missing** | front plate, exterior. |
| Workshop | `bench-far` | **missing** | back plate, interior (`#inside`). |
| Workshop | `bench-near` | **missing** | front plate, interior. |

A missing slot rendering a dashed labelled box is the **designed** state, not a bug.

**`assets/img/workshop/` holds nine photographs the owner took of furniture he actually
refurbished. Never generate, replace, re-export or grade these.** A generated image
presented as real refurbished work is a fabricated portfolio item.

### The one expected test failure

`npm test` is **570/571**. The single failure is
`tests/workshop-page.test.ts > references all four arrival image slots`, which asserts
`/assets/img/cottage-far.webp` while the page currently points at `images-2.jpg`. It
resolves the moment the Workshop plates land. **A second failure is yours.**

---

## 2. Ask these before generating anything

The Projects sitting burned eleven rolls partly because nobody asked. Every question
below maps to something that actually went wrong. Ask them as a batch, per room, and
**wait** — `CLAUDE.md` §7 requires a yes before the first render regardless.

### Per room, before any prompt is written

1. **The end-of-scroll frame.** Measure which rows of the source are on screen when
   `--p` is 1, then ask what should be *in* that band. On Projects this was missed and
   the answer turned out to be a featureless dune field — the geometry was fixed three
   times before anyone noticed the image had nothing to show there. For Music the band
   is whatever the cave opens onto; for Workshop exterior it is the forest floor or the
   cottage; for the interior it is the bench surface.
2. **Lighting, explicitly, against the other plate in the same room.** The Projects
   front plate came back with directional sun and hard cast shadows while its back plate
   was flat overcast, and they read as two different days. Grading cannot fix that —
   it cannot remove a cast shadow. State the light in the prompt and check the render
   against the other plate's numbers before accepting.
3. **Where the silhouette edge sits in the frame**, as a fraction. This sets the whole
   CSS geometry (§4). Ask for it as "the near element's top edge should sit about a
   fifth / a third down". Anything above ~0.2 makes the copy hard to clear at rest.
4. **Is the front plate an alpha cutout or a multiply blend?** They are not
   interchangeable. Multiply leaves the title legible *through* the dark shape — that is
   why Projects overrode the spec's Tier-3 ban. A hard edge (cave mouth, tree trunks)
   mattes cleanly; thousands of thin semi-transparent edges (needles, fronds) do not,
   and want multiply.
5. **The end state.** Should the back plate be completely buried, or is a band of it
   showing through the gaps acceptable? This is a real fork: full burial costs travel,
   travel costs scroll, and scroll is what the owner has repeatedly asked to cut.
6. **Time-to-content.** Ask for a target in wheel notches, not in vh. He thinks in "how
   long before I see the actual content", and that is measurable — drive the page with
   `page.mouse.wheel()` and count notches until the first real content element is on
   screen. Projects landed at 9.

### Room-specific

**Music — the Recursion room.** Accent is orchid `#b97fc9`; per `docs/image-rooms-queue.md`
the biome is a cave.

- Is `20740152436-12f8b92839-b.jpg` a keeper or a placeholder? If a keeper it needs a
  real filename, a grade and a ledger row; if not, `cave-far` needs generating.
- What is the *near* element — the cave mouth framing the view, stalactites overhead,
  a rock wall edge?
- Is the viewer inside looking out, or outside looking in? This decides whether the
  bright area is the centre or the edge, and therefore where the title can sit.
- The room is orchid, but the concept is **green lives in the photography, never in the
  interface**, and clay `#cf6b3e` is reserved for actions. Ask whether the cave should
  carry any orchid *in the photograph* (mineral, bioluminescence) or stay neutral rock
  with the accent living only in the UI.

**Workshop — exterior, then interior.** Accent ochre `#c0a06a`. Two sittings, not one.

- `docs/image-rooms-queue.md` locks the direction and says **do not re-litigate**:
  northern spruce, vertical straight trunks, clear floor, cold flat overcast light,
  cold blue-green and grey — deliberately contrasting with Home's warm tropical jungle.
  Confirm it still holds, then stop asking.
- **The cottage's lit window is the only warm light in the frame.** That is what makes
  "go inside" legible without instruction. Do not add other warm sources, and keep any
  bark dark and desaturated so it never approaches clay.
- Is `images-2.jpg` a keeper or a placeholder? Same question as `cave-far`.
- For the interior: whose bench is it meant to look like — a real cluttered working
  bench, or a styled one? The nine real photos next to it set the honesty bar, and a
  too-perfect generated bench beside them will read as a lie.
- Should the interior plates match the *tone* of the nine real photographs? Measure
  those and hand the numbers to the prompt rather than guessing.

---

## 3. Spend

`CLAUDE.md` §7: present the slot list, dimensions and estimated cost, and **wait for a
yes**. Then generate **one image at a time** — never a batch — and stop again if the cost
or the slot list changes.

Real numbers, from `node ~/.claude/skills/image-gen/generate.mjs --dry-run` (spends
nothing — always dry-run first):

| | 1024x1360 | 2048x2736 |
|---|---|---|
| `--quality low` | $0.008 | $0.03 |
| `--quality medium` | — | $0.28 |
| `--final` (high) | — | $1.13, over the script's own $0.50 guardrail |

**The workflow that worked, and cost $0.288 for a slot the previous session spent $0.14
failing at:** one `--quality low` roll to settle *composition*, show it to the owner, then
one `medium` render of the winner with `--ref <the approved roll>` to buy *detail*. There
is no seed, so `--ref` is the only way to keep a composition you have already had
approved — it held the crest to within 0.003 of the frame while detail rose 34%.

Running total is ~$2.27. `ridge-far`'s $0.32 final is approved but unspent.

**Never delete a generated roll.** Every one gets its own `assets/img/roll-*.png` and
stays; `ridge-near.webp` is a derived artifact rebuilt from `roll-near-09.png`.
**Log every roll to `docs/image-slots.md` in the same commit**, failures included.

---

## 4. The front-plate recipe, already solved — reuse it

`#ridge .plate--front` in `src/styles/stack.css` is a worked example with the algebra in
the comment. Read it before writing Music's or Workshop's. The load-bearing parts:

- **Do not let the shared `.plate > .frame` rule scale a front plate.** It is
  `height: 100% - --rate` and `object-fit: cover` scales the source to it, so the
  silhouette's position becomes a *fraction of a box that grows exactly as fast as the
  plate travels*. Raising `--rate` to bury the back plate magnifies the source by the
  same factor. Give the plate its own scoped box instead: pin the image at its natural
  height and position it with an offset. Scale then stays 1.0 and the image is never
  resampled.
- **Put an ID in the selector.** `#room .plate--front > .frame` is (1,2,0) and
  out-specifies the (0,2,0) the visual editing panel writes into
  `layout.generated.css`. Without it a panel edit silently wins.
- **Crop the source to the rows that are actually on screen.** Projects' render was
  2048x2736; rows above the crest are transparent and rows below ~1200 never enter the
  viewport. Cropping to 2048x1600 took it from 1713 KB to 943 KB *and* reduced the travel
  needed, which is what bought a shorter scroll and gentler motion at the same time.
- **Time-to-content and animation speed are the same dial.** Content appears after
  `--stack-h - 100svh`, which is exactly the runway `--p` is normalised across. Shorter
  scroll and slower motion pull in opposite directions; the only way to buy both is to
  reduce how far the plate travels.
- **`tools/mist.py`** is the alpha-safe grade + atmospheric veil. Use it when a front
  plate's light does not match its back plate. `tools/grade.py` is the sitewide grade but
  `convert('RGB')`s, so it **destroys a cutout's alpha** — never run it on a Tier-3 plate.
- **`tools/checkplate.py`** gates a multiply plate on corner RGB (must be pure white) and
  wordmark-band coverage (<=25%). Never eyeball either.

---

## 5. Verify like this, or do not claim it

The previous session's failures were verification failures, not information failures.

- Drive the page with **real `page.mouse.wheel()`** events. Lenis ignores programmatic
  `scrollTo`, and that gap is what let an unscrollable overlay ship once.
- **Look at the screenshot before making any claim.** "Buried at four viewports" was
  reported while the render was a visible kaleidoscope.
- Measure across **1280x800, 1440x900, 1686x950, 1920x1080, 390x844, 744x1000**. For each
  plate: does the copy clear it at rest, is the copy hidden at the end, is there a gap at
  the bottom at any scroll position, and is the image resampled (scale != 1.0)?
- `npm run filmstrip -- http://localhost:5174/music.html "#<stack>"` tiles eight frames
  across a stack's runway at two viewports.
- Dev server is port **5174** and `devservers list` first — never invent a port.
- The gate is all four, green: `npm test && npx tsc -b --noEmit && npm run lint && npm run build`.

---

## 6. Do not repeat these

From `HANDOFF.md` §5, all of which cost the owner real time:

1. **Never delete or overwrite a generated image**, including reference images he
   uploaded. Two were destroyed and he had to re-upload them.
2. **Never hand-edit `src/styles/layout.generated.css`** expecting it to survive — it is
   rewritten wholesale on every panel Save. Its band-trim control is now withdrawn and
   guarded by `tests/plate-frame-trim.test.ts`; if that test fails, a trim has come back
   and the plate is about to look "too short" again. It is not the image.
3. **When he corrects something, establish whether it is that spot or the whole image.**
   He said the title was hard to read; a session graded the entire image dark.
4. **One change at a time, shown to him.** Things he liked have disappeared inside
   batches he did not ask for.
5. **He writes his own copy.** Do not defend prose or re-word his lede.
6. **`docs/resume.md` is canon** for every fact and number. Unknowns ship as a literal
   `—` plus an HTML comment, never a fabrication.
