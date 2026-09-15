# yosefpilip.com — working agreement

Read this before planning or executing anything. It exists so you don't have to ask
Yosef things he has already answered.

---

## 1. What the finished product is

A personal brand hub — one link that works for a recruiter, a Zip Launchpad mentor, a
promoter, and a friend. Not a recruiting funnel, no single call to action.

Three things define "done," in the owner's words:

- **Scroll-driven animation.** The site is felt by scrolling it. Layered parallax
  depth — background, copy, foreground moving at different rates — is the signature,
  not decoration. Every page is a different natural setting rendered as scroll-linked
  layers.
- **It must not look AI-generated.** No template posture, no default component-library
  look, no stock-SaaS gradient-and-card layout. If a section could have come out of any
  builder, it's wrong.
- **Unique.** Distinctive typography, real editorial layout decisions, asymmetry where
  it earns attention.

**The concept in one line:** *the page is the soil; the images are the growth.* Green
lives in the photography, never in the interface. The UI is dark, neutral,
bone-on-charcoal with one warm clay accent. **If UI chrome starts turning green, the
concept has broken.**

Four rooms, one building: Home, Projects, DJ & Music, Workshop. Shared fixed palette
(`--fg` bone `#f0efe9` — never pure white; `--accent` clay `#cf6b3e` — action only),
per-room `--bg`/`--accent-2` swapped by `[data-room]`. No hardcoded hex anywhere; no
shadows used as fake light (a zero-blur focus ring is a focus ring, not a shadow).

Full detail: [the design spec](docs/superpowers/specs/2026-09-11-portfolio-overgrowth-rebuild-design.md).

---

## 2. Pace — build fast, don't polish forever

**A good page should take about an hour. A scrolling bug should not.**

That's the calibration. If a bug has eaten more than ~20 minutes and it doesn't block
shipping a page, log it and move on. New surface beats old polish.

Order of work in any plan, regardless of task numbering:

1. Pages and features that don't exist yet.
2. Guards and tests that protect what now exists.
3. Bugs and polish on what already shipped.

A bug only jumps the queue if it makes a page unusable or unshippable.

**Why this is written down:** Plan 3 spent 80 minutes on remediation — copy fixes,
overlay bugs, two CSS declarations, a stylesheet extraction — before the first real
page task dispatched. Remediation produces commits, so it feels like progress, but it
moves nothing you can see.

---

## 3. Tests always run. Review rounds are what gets cut.

**Never skip the test suite.** `npm test`, `tsc`, and `lint` run on every task. The
guards exist because they catch real regressions — the ≥32px negative-tracking rule and
the no-hardcoded-hex sweep have each already caught live bugs. Do not weaken, skip, or
`.skip()` a test to move faster.

What gets calibrated is **agent round-trips**, not verification:

| Depth | When |
|---|---|
| Implementer → review → fix → re-review | [src/shared/](src/shared/), scroll/history/focus behavior, anything with a prior browser-only Critical |
| One review pass | Greenfield pages, new stylesheets, copy — disjoint file sets |
| No review agent | Dead-code deletion, pure extraction with no behavior change |

Browser-verify with **real events** (`page.mouse.wheel()`), not programmatic
`.click()`/`evaluate()`. That gap is exactly what let the overlay ship unscrollable.

---

## 4. Parallelize — with one real caveat

If the pre-flight conflict scan clears two tasks as sharing no source files, dispatch
them together.

**But source-file disjointness is not enough.** Concurrent agents collide on build
artifacts: two `npm run build` runs both write `dist/`, and two full `npm test` runs
each fail on the other's half-written page. When running agents in parallel:

- Forbid `npm run build` in the parallel agents; the controller runs it once after both land.
- Scope each agent to its own test file plus the directory sweeps that pick up its new
  stylesheet, and tell it to ignore sweep failures naming the other agent's files.
- Have each agent `git add` explicit paths and retry once on `index.lock`.

---

## 5. Standing facts — do not ask, do not invent

**[docs/resume.md](docs/resume.md) is canon for every fact and number on the site.**
Never ship a number that isn't there. Unknown values ship as a literal `—` plus an HTML
comment naming what belongs there — never a fabrication.

Yosef Pilip — CS student at San Diego State (B.S., Aug 2024 – Jun 2028 expected, GPA
3.8) and an AI developer. Builds full-stack LLM-powered apps and internal automation.
Also a DJ. yosefpilip@gmail.com · github.com/yosefPilip · linkedin.com/in/yosefpilip

- **AI Software Developer, CloudGeometry**, May 2025 – Present. Slack HR bot
  (Python/Gemini) for ~100 employees, 3 days → same-day; role-based HR platform saving
  $8k/yr; Apps Script security auditing replacing 40 hrs/month.
- **Founder & CEO, Cache It**, Aug 2026 – Present. NFC art discovery app (React/Vite +
  FastAPI), SDSU Zip Launchpad Fall 2026.
- Leadership: AEPi Events (50-person team, $12k budget, 400+ turnout), Hillel Business
  Initiative, Tzofim North America.
- Projects: Batch Podcast Generator, Resell Assistant (Claude MCP), this site.

**Traps that have already caused rework — get these right the first time:**

- Aztec Robotics is a **club membership**, not a leadership role. "President & Software
  Lead" has no source and stays dropped.
- Russian is **Advanced/Conversational**, never "Native."
- Cache It uses **NFC** (upgrade path: NTAG 424 DNA). Never image recognition.
- CloudGeometry is **one continuous role**. Do not split it.
- Cache It is an Experience entry, but Home's Experience section deliberately lists only
  the four non-Cache-It roles — it gets its own case study. That's a layout decision,
  not a contradiction.

---

## 6. Decisions already made — don't re-ask these

| Question | Answer |
|---|---|
| City | **"Bay Area & San Diego."** Publishable. Reverses spec §14 and the résumé's Notes. |
| eBay / Mercari handles | **Dropped**, not unknown. No `—` placeholder. Depop is `depop.com/explosef`. |
| DJ Music Sorter | Real, documented at `C:/Users/yosef/Dev/dj-tool/docs/superpowers/specs/2026-06-15-dj-tool-design.md`. |
| The Rekordbox cleanup tool | **Unlisted.** Projects keeps six rows. Do not merge it with DJ Music Sorter. |
| Clay `+` marks | **Keep them.** He likes them — they just needed to sit level with the project name. |
| Images | **Generate them — but one at a time, and only after he approves the spend.** Never batch a set in one go: generate one, size it, look at it in the page, then decide on the next. Every image ships correctly sized for its slot and readable on a phone. Until a slot is filled it renders a labelled placeholder — that's the designed fallback, not a failure. |
| `/projects.html` ~100ms detail flash | Low priority. Structure bothered him more than the flash. |

Parked design calls awaiting him — don't spend rounds on them: the case-study overlay
body sitting left-aligned beside the rail rather than viewport-centred, and the rail
being desktop-only below 1100px.

---

## 7. Always stop and ask

- **Deploys.** Vercel or anything outward-facing. Never as a plan step.
- **Image generation, before the first render.** Real spend. Present the slot list,
  dimensions and estimated cost and wait for a yes. After that yes, generate **one image
  at a time** — never a batch — and stop again if the cost or the slot list changes.
- **Design changes nobody asked for.** Surface as a question; don't widen scope silently.

---

## 8. Stack and gate

Vite multi-page, static HTML/CSS with React islands (Coverflow, intro animation).
Lenis for scroll. Any new page must be added to `vite.config.ts`'s
`rollupOptions.input` or it never builds while every test still passes.

```
npm test && npx tsc -b --noEmit && npm run lint && npm run build
```

All four, green, before calling anything done.
