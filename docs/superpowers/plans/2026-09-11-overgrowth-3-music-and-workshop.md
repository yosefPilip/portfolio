# Overgrowth 3 — Music, Workshop & Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the last two rooms — DJ & Music (cave club) and Workshop (the `RE—` page) — then generate the image set and run the launch pass.

**Architecture:** Both pages reuse the three-layer stack, chrome and token system from Plans 1 and 2. The existing Coverflow React island is kept and recoloured rather than rebuilt. The Workshop page is organised around the `RE—` prefix, with a before/after grid whose photographs are the owner's own, never generated.

**Tech Stack:** Vite 8 multi-page build, TypeScript 6, React 19 (Coverflow island), Vitest + jsdom, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-11-portfolio-overgrowth-rebuild-design.md`

**Plan 3 of 3.** Requires Plans 1 and 2 complete.

---

## Global Constraints

All of Plan 1's Global Constraints apply unchanged. Additionally:

- **Rooms:** `<body data-room="music">` and `<body data-room="workshop">`.
- **No six-layer hero.** Three-layer stacks only (spec §7).
- **The Coverflow island is not rebuilt.** It works; it gets recoloured (spec §8.3).
- **The photography integrity line (spec §8.4) is not negotiable.** The workbench hero is generated atmosphere. Every before/after is the owner's own photograph. A generated image presented as a real refurbished piece is a fabricated portfolio item and fails the definition of done.
- **The music room bends the prompt lock** toward orchid light; the workshop room bends it toward warm interior light. Everything else about the lock — 35mm, underexposed, grain, no neon, no flare — holds.

---

## File Structure

| File | Responsibility |
|---|---|
| `music.html` | DJ & Music. Full rewrite. |
| `workshop.html` | Workshop. New page. |
| `src/entries/music.tsx` | Music page entry. `.tsx` because it mounts the Coverflow island. |
| `src/entries/workshop.ts` | Workshop page entry. |
| `src/styles/music.css` | Cave hero, Recursion intro, coverflow surround. |
| `src/styles/workshop.css` | `RE—` act headings, before/after grid. |
| `src/styles/coverflow.css` | Recoloured to tokens. |
| `assets/img/*.webp` | The 16 generated slots. |

---

### Task 1: DJ & Music — cave hero and recoloured coverflow

**Files:**
- Modify: `music.html` (full rewrite)
- Create: `src/entries/music.tsx`
- Create: `src/styles/music.css`
- Modify: `src/styles/coverflow.css`
- Create: `tests/music-page.test.ts`

**Interfaces:**
- Consumes: `base.css`, `stack.css`, `chrome.css`, `initChrome()`, `initMotion()` (Plans 1–2); the existing `Coverflow` component and `#coverflow-root` mount point.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `tests/music-page.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findForbiddenCopy, findHardcodedHex } from '../src/lib/guards';

const html = readFileSync('music.html', 'utf8');
const css = readFileSync('src/styles/coverflow.css', 'utf8');

describe('music.html', () => {
  it('declares the music room', () => {
    expect(html).toMatch(/<body[^>]*data-room="music"/);
  });

  it('keeps the coverflow mount point — the island is not rebuilt', () => {
    expect(html).toContain('id="coverflow-root"');
  });

  it('uses a three-layer cave hero, not the six-layer one', () => {
    expect(html).toContain('plate--back');
    expect(html).toContain('plate--front');
    expect(html).not.toContain('plate--trunks');
  });

  it('carries the real links', () => {
    expect(html).toContain('soundcloud.com/recursion-mp3');
    expect(html).toContain('instagram.com/recursion.mp3');
  });

  it('carries no banned copy', () => {
    expect(findForbiddenCopy(html)).toEqual([]);
  });
});

describe('coverflow.css', () => {
  it('has been moved onto tokens', () => {
    expect(findHardcodedHex(css)).toEqual([]);
  });

  it('has no lime left from the old palette', () => {
    expect(css.toLowerCase()).not.toContain('a4d64c');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Sector_06` present, no `data-room`, coverflow still lime.

- [ ] **Step 3: Rewrite `music.html`**

Keep the same `<head>` pattern as `projects.html`, swapping the stylesheet to `/src/styles/music.css`, the title to `DJ & Music — Yosef Pilip`, the description to `I play as Recursion — tech house, summer and dub-leaning sets.`, and `aria-current="page"` onto the DJ & Music nav link. Then:

```html
<body data-room="music">

  <div class="grain" aria-hidden="true"></div>

  <!-- header + mobile menu: paste Appendix A from the end of this plan,
       with aria-current="page" on the /music.html link -->

  <main>

    <section class="stack page-hero">
      <div class="stack-view">
        <div class="plate plate--back">
          <figure class="frame" style="--ar: 3 / 2; height: 100%;" data-label="Music L1 — cave-far">
            <img src="/assets/img/cave-far.webp" alt="" loading="eager" />
          </figure>
        </div>
        <div class="plate plate--copy">
          <h1 class="display">Recursion</h1>
          <p class="lede">Tech house, summer and dub-leaning. A room either moves or it doesn&rsquo;t, and you know inside eight bars.</p>
        </div>
        <div class="plate plate--front">
          <figure class="frame" style="--ar: 3 / 2; height: 100%;" data-label="Music L3 — cave-near">
            <img src="/assets/img/cave-near.webp" alt="" loading="eager" />
          </figure>
        </div>
      </div>
    </section>

    <section class="section section--tight" id="about-music">
      <div class="container split-7-5">
        <div class="reveal">
          <h2>The fastest feedback loop I have.</h2>
          <p>Writing software, you find out whether you were right in a week. Playing a room, you find out in eight bars. I like both, but only one of them argues back in real time.</p>
          <p>I play as <strong>Recursion</strong> &mdash; mostly tech house, leaning summery and dubby. I also play guitar and piano, which is where most of this started.</p>
        </div>
        <dl class="spec reveal">
          <dt>Alias</dt><dd>Recursion</dd>
          <dt>Sound</dt><dd>Tech house &middot; summer &middot; dub</dd>
          <dt>Also</dt><dd>Guitar, piano</dd>
        </dl>
      </div>
    </section>

    <section class="section" id="mixes">
      <div class="container">
        <h2 class="reveal">Mixes</h2>
        <p class="meta reveal">Use the arrows, swipe, or click a cover &mdash; the centred mix opens on SoundCloud.</p>
      </div>
      <div class="reveal"><div id="coverflow-root"></div></div>
    </section>

    <section class="section section--tight" id="connect">
      <div class="container">
        <div class="panel panel--tint reveal">
          <h2>Come find the set.</h2>
          <p class="lede">Everything lives on SoundCloud. Dates and the occasional clip go up on Instagram.</p>
          <p><a class="btn btn--primary" href="https://soundcloud.com/recursion-mp3" target="_blank" rel="noopener">Listen on SoundCloud</a></p>
          <p class="meta contact__links">
            <a class="link" href="https://www.instagram.com/recursion.mp3/" target="_blank" rel="noopener">@recursion.mp3</a>
          </p>
        </div>
      </div>
    </section>

  </main>

  <!-- footer: paste Appendix B from the end of this plan -->

  <script type="module" src="/src/entries/music.ts"></script>

</body>
```

- [ ] **Step 4: Create the entry**

Create `src/entries/music.ts`:

```ts
import { createRoot } from 'react-dom/client';
import { Coverflow } from '../components/Coverflow';
import { initChrome } from '../shared/chrome';
import { initMotion } from '../shared/motion';

initChrome();
initMotion();

const coverflowRoot = document.getElementById('coverflow-root');
if (coverflowRoot) {
  createRoot(coverflowRoot).render(<Coverflow />);
}
```

Rename the file to `src/entries/music.tsx` since it contains JSX, and reference `/src/entries/music.tsx` from `music.html`.

Then remove the Coverflow mount from `src/main.tsx` — it now belongs to the music entry, and `main.tsx` is Home's entry only. Delete these lines from `src/main.tsx`:

```tsx
import { Coverflow } from './components/Coverflow';
import './styles/coverflow.css';

const coverflowRoot = document.getElementById('coverflow-root');

if (coverflowRoot) {
  createRoot(coverflowRoot).render(<Coverflow />);
}
```

- [ ] **Step 5: Create the music stylesheet and recolour the coverflow**

Create `src/styles/music.css`:

```css
@import './base.css';
@import './stack.css';
@import './chrome.css';
@import './coverflow.css';

.page-hero { --stack-h: 180vh; }
.page-hero .plate--copy { text-align: center; }
.page-hero .lede { margin-inline: auto; }

#mixes .meta { margin-top: 8px; margin-bottom: clamp(24px, 3vw, 40px); }
.contact__links { display: flex; gap: 20px; margin-top: 22px; }

/* .spec and .link live in chrome.css (moved there in Plan 2 Task 2 Step 6).
   Do not redefine them here — four pages share them. */
```

In `src/styles/coverflow.css`, add `@import './tokens.css';` as the first line and replace every colour literal:

| Old role | Replace with |
|---|---|
| card background / empty slot | `var(--surface)` |
| card border | `var(--border)` |
| stage backdrop | `var(--bg-deep)` |
| title text | `var(--fg)` |
| artist / meta text | `var(--muted)` |
| lime `#a4d64c` highlight | `var(--accent-2)` |
| arrow buttons (they are clickable) | `var(--accent)` fill with `var(--on-accent)` text |

Reflections and shadows that exist purely to fake depth should be removed rather than recoloured — the spec bans shadow-used-as-light. Keep the 3D transform; drop any `box-shadow` glow.

- [ ] **Step 6: Run, verify, commit**

Run: `npm test && npx tsc -b --noEmit && npm run build`

Then `npm run dev` and confirm on `/music.html`: the cave hero shows two labelled placeholders, the coverflow still spins and still opens SoundCloud on click, and nothing glows.

```bash
git add music.html src/entries/music.tsx src/styles/music.css src/styles/coverflow.css src/main.tsx tests/music-page.test.ts
git commit -m "feat: rebuild the music page with a cave hero and recoloured coverflow"
```

---

### Task 2: Workshop — the `RE—` page

**Files:**
- Create: `workshop.html`
- Create: `src/entries/workshop.ts`
- Create: `src/styles/workshop.css`
- Modify: `vite.config.ts`
- Create: `tests/workshop-page.test.ts`

**Interfaces:**
- Consumes: `base.css`, `stack.css`, `chrome.css`, `initChrome()`, `initMotion()`.
- Produces: `/workshop.html`, which Home's Elsewhere panel and the Resell Assistant detail row both already link to.

- [ ] **Step 1: Write the failing test**

Create `tests/workshop-page.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { findForbiddenCopy } from '../src/lib/guards';

const html = readFileSync('workshop.html', 'utf8');

describe('workshop.html', () => {
  it('declares the workshop room', () => {
    expect(html).toMatch(/<body[^>]*data-room="workshop"/);
  });

  it('runs the three RE— acts in order', () => {
    const acts = Array.from(html.matchAll(/data-act="(\w+)"/g)).map((m) => m[1]);
    expect(acts).toEqual(['rescue', 'renew', 'resell']);
  });

  it('sets each act as RE with a changing suffix', () => {
    expect(html).toContain('>Re</span><span class="act__suffix">scue<');
    expect(html).toContain('>Re</span><span class="act__suffix">new<');
    expect(html).toContain('>Re</span><span class="act__suffix">sell<');
  });

  it('carries the manufacturing background', () => {
    expect(html).toContain('SolidWorks');
    expect(html).toContain('CNC');
    expect(html).toContain('powder-bed fusion');
  });

  it('links across to the Resell Assistant project', () => {
    expect(html).toContain('/projects.html#resell-assistant');
  });

  it('marks every before/after shot as a photograph the owner took', () => {
    const shots = html.match(/<figure class="frame ba__shot"[^>]*>/g) ?? [];
    expect(shots).toHaveLength(5); // piece 1: before/during/after; piece 2: before/after
    shots.forEach((f) => expect(f).toContain('data-own-photo="true"'));
  });

  it('points every shot at a file that actually exists', () => {
    const srcs = Array.from(html.matchAll(/src="(\/assets\/img\/workshop\/[^"]+)"/g)).map((m) => m[1]);
    expect(srcs).toHaveLength(5);
    srcs.forEach((src) => expect(existsSync(`.${src}`)).toBe(true));
  });

  it('gives every workshop photo real alt text — they are the page evidence', () => {
    const imgs = html.match(/<img src="\/assets\/img\/workshop\/[^>]*>/g) ?? [];
    imgs.forEach((img) => {
      const alt = img.match(/alt="([^"]*)"/);
      expect(alt).not.toBeNull();
      expect(alt[1].length).toBeGreaterThan(10);
    });
  });

  it('links the real Depop shop, leaving the other two as honest dashes', () => {
    expect(html).toContain('depop.com/explosef');
    expect(html).toContain('<!-- OPEN: eBay');
    expect(html).toContain('<!-- OPEN: Mercari');
  });

  it('carries no banned copy', () => {
    expect(findForbiddenCopy(html)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Write `workshop.html`**

Head follows the same pattern; stylesheet `/src/styles/workshop.css`, title `Workshop — Yosef Pilip`, description `Thrifting, refurbishing and reselling — plus the machine shop the habit came from.`, `aria-current="page"` on the Workshop nav link.

```html
<body data-room="workshop">

  <div class="grain" aria-hidden="true"></div>

  <!-- header + mobile menu: paste Appendix A, with aria-current="page" on
       the /workshop.html link -->

  <main>

    <section class="stack page-hero">
      <div class="stack-view">
        <div class="plate plate--back">
          <figure class="frame" style="--ar: 3 / 2; height: 100%;" data-label="Workshop L1 — bench-far">
            <img src="/assets/img/bench-far.webp" alt="" loading="eager" />
          </figure>
        </div>
        <div class="plate plate--copy">
          <h1 class="display">Workshop</h1>
          <p class="lede">Finding things, fixing things, and letting them go again.</p>
        </div>
        <div class="plate plate--front">
          <figure class="frame" style="--ar: 3 / 2; height: 100%;" data-label="Workshop L3 — bench-near">
            <img src="/assets/img/bench-near.webp" alt="" loading="eager" />
          </figure>
        </div>
      </div>
    </section>

    <section class="section section--tight" id="intro">
      <div class="container">
        <p class="lede reveal" style="max-width: 34ch;">Three verbs, and they&rsquo;re all the same one.</p>
      </div>
    </section>

    <!-- ── ACT 1 ── -->
    <section class="section act" id="rescue" data-act="rescue">
      <div class="container split-7-5">
        <h2 class="act__word reveal"><span class="act__re">Re</span><span class="act__suffix">scue</span></h2>
        <div class="reveal">
          <p>Thrifting is a filtering problem with bad tooling. Everything is one-of-one, nothing is labelled properly, and the only index is your own eyes going along a rail.</p>
          <p>What I&rsquo;m looking for is the gap between what something is and what it looks like right now. A good piece under a bad finish is worth more than a mediocre piece in good shape, because the first one is a problem I can solve and the second one is just a purchase.</p>
        </div>
      </div>
    </section>

    <!-- ── ACT 2 ── -->
    <section class="section act" id="renew" data-act="renew">
      <div class="container">
        <div class="split-7-5">
          <h2 class="act__word reveal"><span class="act__re">Re</span><span class="act__suffix">new</span></h2>
          <div class="reveal">
            <p>Stripping, sanding, repairing, refinishing. Some of it is furniture, some of it is smaller craft work. The part I like is that the object tells you immediately whether you were right &mdash; there&rsquo;s no arguing with a surface.</p>
          </div>
        </div>

        <!-- Real photographs of real pieces, already committed to
             assets/img/workshop/. Never generated. -->
        <div class="ba reveal">

          <figure class="ba__piece ba__piece--three">
            <figure class="frame ba__shot" style="--ar: 4 / 5;" data-own-photo="true" data-label="Low cabinet — before">
              <img src="/assets/img/workshop/piece-1-before.webp" alt="A worn orange-brown cabinet with a badly damaged top, sitting in a garage" loading="lazy" />
            </figure>
            <figure class="frame ba__shot" style="--ar: 4 / 5;" data-own-photo="true" data-label="Low cabinet — during">
              <img src="/assets/img/workshop/piece-1-during.webp" alt="The same cabinet stripped to its carcass outdoors, with a new top being fitted" loading="lazy" />
            </figure>
            <figure class="frame ba__shot" style="--ar: 4 / 5;" data-own-photo="true" data-label="Low cabinet — after">
              <img src="/assets/img/workshop/piece-1-after.webp" alt="The finished cabinet painted white with a dark walnut top" loading="lazy" />
            </figure>
            <figcaption class="meta">Low cabinet &mdash; the top was past saving, so it got a new one.</figcaption>
          </figure>

          <figure class="ba__piece">
            <figure class="frame ba__shot" style="--ar: 4 / 5;" data-own-photo="true" data-label="Side cabinet — before">
              <img src="/assets/img/workshop/piece-2-before.webp" alt="A small orange-brown side cabinet with a water-damaged top" loading="lazy" />
            </figure>
            <figure class="frame ba__shot" style="--ar: 4 / 5;" data-own-photo="true" data-label="Side cabinet — after">
              <img src="/assets/img/workshop/piece-2-after.webp" alt="The same cabinet in white with a stained wood top and black hardware" loading="lazy" />
            </figure>
            <figcaption class="meta">Side cabinet &mdash; original grain kept on the top, everything else painted out.</figcaption>
          </figure>

        </div>
      </div>
    </section>

    <!-- ── ACT 3 ── -->
    <section class="section act" id="resell" data-act="resell">
      <div class="container split-7-5">
        <h2 class="act__word reveal"><span class="act__re">Re</span><span class="act__suffix">sell</span></h2>
        <div class="reveal">
          <p>Then it goes back out &mdash; Depop, eBay, Mercari, depending on what it is and who&rsquo;s looking. Pricing is the interesting half. Get it wrong high and it sits there telling you that you were wrong; get it wrong low and you find out instantly.</p>
          <p class="workshop__shops">
            <a class="link" href="https://www.depop.com/explosef/" target="_blank" rel="noopener">Depop &#8599;</a>
            <!-- OPEN: eBay handle and link -->
            <span class="meta">eBay &mdash;</span>
            <!-- OPEN: Mercari handle and link -->
            <span class="meta">Mercari &mdash;</span>
          </p>
        </div>
      </div>
    </section>

    <!-- ── WHERE THE HANDS CAME FROM ── -->
    <section class="section section--tight" id="shop">
      <div class="container split-5-7">
        <h2 class="reveal">Where the hands came from</h2>
        <div class="reveal">
          <p>I dual-enrolled in manufacturing engineering at De Anza while I was still in high school. CAD and SolidWorks, 3D printing across FDM, VAT and powder-bed fusion, CNC machining, and manual metalwork &mdash; designing parts and then actually making them, end to end.</p>
          <p>That&rsquo;s the part that makes the rest of this page a habit rather than a hobby. Once you&rsquo;ve machined something to a tolerance, a wobbly chair stops looking like a chair and starts looking like a fixable joint.</p>
        </div>
      </div>
    </section>

    <!-- ── THE TOOL ── -->
    <section class="section" id="tool">
      <div class="container">
        <div class="panel panel--tint reveal">
          <p class="eyebrow">Which is why I built</p>
          <h2>Resell Assistant</h2>
          <p class="lede">Pricing by feel works until you&rsquo;re holding forty things at once.</p>
          <p>So I wrote an MCP server I can ask in plain language what something is worth &mdash; and which keeps the financial and inventory tracker in Google Sheets current on its own, instead of me updating a spreadsheet at midnight.</p>
          <p><a class="btn btn--primary" href="/projects.html#resell-assistant">See the project</a></p>
        </div>
      </div>
    </section>

  </main>

  <!-- footer: paste Appendix B -->

  <script type="module" src="/src/entries/workshop.ts"></script>

</body>
```

- [ ] **Step 4: Create the entry and stylesheet**

Create `src/entries/workshop.ts`:

```ts
import { initChrome } from '../shared/chrome';
import { initMotion } from '../shared/motion';

initChrome();
initMotion();
```

Create `src/styles/workshop.css`:

```css
@import './base.css';
@import './stack.css';
@import './chrome.css';

.page-hero { --stack-h: 180vh; }
.page-hero .plate--copy { text-align: center; }
.page-hero .lede { margin-inline: auto; }

/* ── the RE— device: one word repeating, only the suffix resolving ── */
.act { border-top: 1px solid var(--border); }
.act__word {
  font-family: var(--font-display);
  font-size: var(--step-display);
  line-height: 0.95;
  letter-spacing: -0.03em;   /* display ≥32px always gets negative tracking */
}
.act__re { color: var(--fg); }
.act__suffix { color: var(--accent-2); }

.workshop__shops { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 20px; }

/* ── before / after ── */
.ba { display: grid; gap: clamp(28px, 4vw, 56px); margin-top: clamp(32px, 4vw, 64px); }
.ba__piece { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
/* Piece 1 has a during frame, so it runs three across. */
.ba__piece--three { grid-template-columns: repeat(3, 1fr); }
.ba__piece figcaption { grid-column: 1 / -1; margin-top: 10px; }
@media (max-width: 600px) { .ba__piece--three { grid-template-columns: 1fr 1fr; } }
/* The left shot is the "before" — labelled with the category colour, not clay,
   because it is a label and not a control. */
.ba__shot[data-label$='before']::before {
  content: 'Before';
  position: absolute;
  z-index: 2;
  top: 8px;
  left: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent-2);
}
.ba__shot[data-label$='during']::before {
  content: 'During';
  position: absolute;
  z-index: 2;
  top: 8px;
  left: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent-2);
}
.ba__shot[data-label$='after']::before {
  content: 'After';
  position: absolute;
  z-index: 2;
  top: 8px;
  left: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg);
}

/* .spec and .link come from chrome.css. Not redefined here. */
```

- [ ] **Step 5: Register the page**

In `vite.config.ts`, add to `input`:

```ts
        workshop: resolve(__dirname, 'workshop.html'),
```

- [ ] **Step 6: Run, verify, commit**

Run: `npm test && npx tsc -b --noEmit && npm run build`

Then `npm run dev` and confirm on `/workshop.html`: the three `RE—` headings read as one word resolving three ways, the six before/after frames show labelled placeholders naming which piece and which side, and the shop links are visible dashes rather than fake handles.

```bash
git add workshop.html src/entries/workshop.ts src/styles/workshop.css vite.config.ts tests/workshop-page.test.ts
git commit -m "feat: add the Workshop room built on the RE— device"
```

---

### Task 3: Sitewide guard sweep

**Files:**
- Create: `tests/sitewide.test.ts`

**Interfaces:**
- Consumes: every page and stylesheet.
- Produces: the regression net that keeps the spec enforceable after this plan ends.

**This is the test that would have caught the original site's problems.** It runs over every page at once, so no future edit can quietly reintroduce the lime palette or a `Sector_` eyebrow.

- [ ] **Step 1: Write the test**

Create `tests/sitewide.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { findForbiddenCopy, findHardcodedHex } from '../src/lib/guards';

const PAGES = ['index.html', 'projects.html', 'music.html', 'workshop.html', 'projects/cache-it.html'];
const STYLES = readdirSync('src/styles')
  .filter((f) => f.endsWith('.css') && f !== 'tokens.css')
  .map((f) => `src/styles/${f}`);

describe.each(PAGES)('%s', (page) => {
  const html = readFileSync(page, 'utf8');

  it('declares a room', () => {
    expect(html).toMatch(/<body[^>]*data-room="(home|projects|music|workshop)"/);
  });

  it('carries no banned copy', () => {
    expect(findForbiddenCopy(html)).toEqual([]);
  });

  it('has exactly one h1', () => {
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
  });

  it('labels every image frame', () => {
    const frames = html.match(/<figure class="frame[^"]*"[^>]*>/g) ?? [];
    frames.forEach((f) => expect(f).toContain('data-label='));
  });

  it('gives every external link rel="noopener"', () => {
    const external = html.match(/<a[^>]*target="_blank"[^>]*>/g) ?? [];
    external.forEach((a) => expect(a).toContain('rel="noopener"'));
  });

  it('invents no metrics', () => {
    expect(html).not.toMatch(/\b\d+x\s+faster\b/i);
    expect(html).not.toMatch(/99\.\d+%\s*uptime/i);
    expect(html).not.toMatch(/lorem ipsum/i);
  });
});

describe.each(STYLES)('%s', (path) => {
  const css = readFileSync(path, 'utf8');

  it('has no colour literals outside the token file', () => {
    expect(findHardcodedHex(css)).toEqual([]);
  });

  it('uses no pure black or pure white', () => {
    expect(css).not.toMatch(/#000\b|#000000\b|#fff\b|#ffffff\b/);
  });

  it('does not animate layout properties', () => {
    const transitions = css.match(/transition:[^;]+;/g) ?? [];
    transitions.forEach((t) =>
      expect(t).not.toMatch(/\b(top|left|right|bottom|width|height|background-position)\b/),
    );
  });
});

describe('internal links', () => {
  it('points only at pages that exist', () => {
    const known = new Set(['/', '/index.html', '/projects.html', '/music.html', '/workshop.html', '/projects/cache-it']);
    for (const page of PAGES) {
      const html = readFileSync(page, 'utf8');
      const hrefs = Array.from(html.matchAll(/href="(\/[^"#?]*)/g)).map((m) => m[1]);
      for (const href of hrefs) {
        if (href.startsWith('/assets') || href.startsWith('/src')) continue;
        expect(known.has(href), `${page} links to ${href}`).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run it and fix whatever it finds**

Run: `npm test`

Expected failures to fix rather than suppress:
- Any page still importing the deleted `src/styles/site.css`.
- Any leftover `target="_blank"` without `rel="noopener"`.
- Any `/workshop.html` or `/projects/cache-it` link that is still broken.

If a temporary `src/styles/site.css` shim was added in Plan 1 Task 8 Step 7, **delete it now**.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: add sitewide guard sweep across every page and stylesheet"
```

---

### Task 4: Accessibility, reduced motion, and breakpoints

**Files:**
- Modify: whichever files the checks below turn up.

**Interfaces:** none — this is a verification task.

- [ ] **Step 1: Reduced motion**

Turn on the OS reduce-motion setting. On all four pages plus the case study, confirm:
- Every stack collapses to a static ~72vh composition.
- Nothing is hidden — all reveal text is visible.
- Nothing moves, including the overlay open animation.

- [ ] **Step 2: Keyboard only**

Unplug the mouse. On `/projects.html`:
- Tab reaches every filter pill and every row button; focus rings are visible.
- Enter expands a row; Enter on "Read the case study" opens the overlay and focus lands on the close button.
- Escape closes the overlay and focus returns to the link that opened it.
- Tab never lands on something invisible behind the overlay.

- [ ] **Step 3: Breakpoints**

At 360 / 390 / 430 / 600 / 744 / 768 / 1024 / 1366 / 1440 / 1920, on all five pages:
- No horizontal scroll at any width.
- The hero name fits one line from 745px up, **with `fonts.gstatic.com` blocked** so the Georgia fallback is what gets measured.
- Below 744px the name wraps to two lines and trunks 3 and 6 are gone.
- The case study rail disappears below 1100px without stranding its links — the back link must still be reachable.

- [ ] **Step 4: Colour discipline**

On each page, count visible uses of clay and of the room's category colour. Each should be about two. Then confirm **every** clay element is clickable. If clay is on something inert, that is the load-bearing rule broken — recolour it to `--fg-dim` or `--accent-2`.

Check ochre against clay on `/workshop.html` specifically. If they blur, desaturate ochre toward `#b5a184` in `tokens.css`. **Do not shift its hue** — that pulls it toward sage.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: accessibility, reduced-motion and breakpoint pass"
```

---

### Task 5: Generate the image set

**Files:**
- Create: `assets/img/*.webp` (16 files)

**Interfaces:** none — these drop into slots that already render.

**Use the `image-gen` skill.** Every slot already shows a labelled placeholder at its exact aspect ratio, so composition can be judged before spending, and dropping a file in needs no code change.

**Shared prompt lock — append to every prompt:**

> deep desaturated greens and wet black, single soft directional light source, overcast or shaft-through-canopy, underexposed with detail retained in shadow, photographic 35mm, shallow depth of field, visible film grain

**Negative for every image:**

> neon, glowing, cyberpunk, lens flare, HDR, oversaturated, vaporwave, text, watermark, logo, CGI render, plastic sheen

Export **WebP at ~q72**. Never ship the raw PNG.

- [ ] **Step 1: `trees-back.webp` — 2400×1600**

The hero's only genuinely required image. Generate first and judge alone.

> A stand of tall bare tree trunks receding into fog, seen straight on, evenly spaced, no canopy visible, no undergrowth, deep desaturated green and grey, flat overcast light, low contrast

Must have vertical rhythm and **no subject** — anything competing for attention fights the wordmark.

- [ ] **Step 2: `canopy-far.webp` — 2400×1600**

> Looking up through a dense dark rainforest canopy, backlit overcast sky barely visible between leaves, deep desaturated green and near-black, soft diffused light, negative space in the centre

**Judge it behind `trees-back`, never on its own.** It must stay quiet in the centre third or the display type stops reading.

- [ ] **Step 3: `server-moss.webp` — 2000×2500**

The concept image. **Do not batch this one** — if it doesn't land, the palette conversation reopens.

> Abandoned server rack in a humid greenhouse, moss and root systems growing through the vents and over the cables, condensation on metal, soft overcast light from one side, deep green and rust

- [ ] **Step 4: `roots-overlay.webp` — 2000×2500**

> Thin aerial roots and vines hanging in extreme foreground, dark silhouette against black, sparse, entering from the top of frame only, shallow focus

- [ ] **Step 5: The three life panels — 1400×1750 each, one batch**

Same prompt skeleton keeps them a consistent set.

- `life-build.webp` — *A laptop and a mechanical keyboard on a dark wood desk, one small potted plant leaning over the screen edge, single window light from the left, deep shadow, no screen glow*
- `life-decks.webp` — *DJ mixer and turntable knobs in low warm light, shot from a low angle, a hand mid-adjustment out of focus, dark room, no LED glare, no neon*
- `life-rack.webp` — *A rack of secondhand clothing against a plain concrete wall, mixed colours and textures, soft daylight from one side, a few hangers pushed apart, no people*

`life-rack` is the **one slot that should carry real saturation**. Let the garments be the brightest thing on the site — that is the honest answer to "the images provide the colour."

- [ ] **Step 6: The ridge pair — 2400×1600 each**

- `ridge-far.webp` — *Distant mountain ridgelines receding in layers of mist, no foreground, no trees, flat grey-blue light*
- `ridge-near.webp` — *A single dark mountain ridge silhouette across the lower third of frame, heavy mist behind it, empty above*

- [ ] **Step 7: The cave pair — 2400×1600 each**

**This is where the lock bends:** the light source reads orchid rather than overcast green. Everything else — 35mm, underexposed, grain, no neon, no flare — holds.

- `cave-far.webp` — *Deep inside a large cave, one shaft of cool violet light falling through haze from an opening far above, wet rock, no people*
- `cave-near.webp` — *Dark rock formations in extreme foreground, silhouetted, framing an empty centre, heavy haze*

- [ ] **Step 8: The bench pair — 2400×1600 each**

**The lock bends warm here:** sawdust and window light rather than canopy light.

- `bench-far.webp` — *A woodworking bench against a wall of hand tools, soft window light from the left, sawdust in the air, worn timber, nobody in frame*
- `bench-near.webp` — *Clamps and wood shavings in extreme foreground, out of focus, silhouetted along the bottom edge, rest of frame empty*

- [ ] **Step 9: The Cache It trio — last, all below the fold**

- `cacheit-street.webp` 2400×1350 — *A small pasted paper artwork on a weathered concrete wall in an alley, ivy creeping up the wall beside it, overcast light, nobody in frame, muted green and grey*
- `cacheit-scan.webp` 1600×1200 — *Hand holding a phone up to a wall at arm's length, phone screen not visible to camera, out-of-focus green foliage behind, overcast daylight*
- `fronds-near.webp` 2400×1600 — **needs real alpha or a pure black background** — *A few large wet fern fronds in extreme foreground, out of focus, silhouetted against pure black, entering from the bottom-left corner only, rest of frame empty black, rain droplets*

- [ ] **Step 10: Do NOT generate anything under `assets/img/workshop/`**

Those five files are the owner's own photographs of two real pieces, already
converted and committed. They are the page's evidence. Generating a substitute
would present a fabricated object as real work and fails the definition of done.

They are also the only photographs on the site that are *not* colour-graded to
the prompt lock, and they should stay that way — a real garage and a real living
room look like a real garage and a real living room. Do not filter them toward
the Overgrowth palette.

- [ ] **Step 11: Check the set reads as one shoot**

Put all 16 on screen together. If one obviously belongs to a different shoot, regenerate that one rather than adjusting the others. Then reload every page and confirm no placeholder remains except the six workshop slots.

- [ ] **Step 12: Commit**

```bash
git add assets/img
git commit -m "feat: add the generated image set"
```

---

### Task 6: Launch checks

**Files:** whatever the checks turn up.

- [ ] **Step 1: Full verification run**

```bash
npm test && npx tsc -b --noEmit && npm run lint && npm run build
```

All four must pass. Do not proceed on a warning you have not read.

- [ ] **Step 2: Walk the spec's definition of done**

Open spec §15 and check every box against the running site. The ones most likely to be quietly false:
- Hero wordmark on one line at 1440px **in the Georgia fallback**.
- Clay only on clickable things.
- `/projects/cache-it` cold-loads, and Back closes the overlay.
- Every unknown is a visible `—` with an HTML comment.

- [ ] **Step 3: Deploy and verify the clean URL**

Deploy to Vercel. Then confirm in a fresh browser that **`yosefpilip.com/projects/cache-it` loads the case study directly** — this is the one behaviour that cannot be verified in `vite dev`, since `cleanUrls` is a Vercel rewrite. If it 404s, check `vercel.json` reached the deployment.

- [ ] **Step 4: Fill the open items when they arrive**

Two remain. Each is a one-line edit:

| Item | Where | Status |
|---|---|---|
| DJ Music Sorter hook | `src/data/projects.ts`, `projects.html` `#music-sorter` | open — being built in another session |
| eBay + Mercari handles | `workshop.html` `.workshop__shops` | open |
| Depop | `workshop.html` `.workshop__shops` | **done** — `depop.com/explosef` |
| Before/after photos | `assets/img/workshop/` | **done** — 2 pieces, 5 shots |
| City | — | **closed** — owner declined to publish one; the row is removed, not dashed |

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: launch checks for the Overgrowth rebuild"
```

---

## Plan 3 self-review

**Spec coverage.** §8.3 Music → Task 1. §8.4 Workshop, including the `RE—` device, the manufacturing section, the Resell Assistant link, and the photography integrity line → Task 2. §12 images, all 16 slots in the spec's generation order → Task 5. §15 definition of done → Tasks 3, 4 and 6. §6.3 reduced motion → Task 4. §5 breakpoints → Task 4.

**Cross-plan gaps now closed.** `/workshop.html` exists (was dangling from Plans 1 and 2). `src/styles/site.css` and any temporary shim are deleted in Task 3. The link-integrity test in Task 3 fails on any remaining dead internal link.

**Type consistency.** `initChrome()` and `initMotion()` take no arguments and are called that way in all four entry files. `src/entries/music.tsx` carries the `.tsx` extension because it contains JSX, and `music.html` references that exact filename. `findForbiddenCopy` / `findHardcodedHex` keep the signatures defined in Plan 1 Task 1 across all three sitewide test suites.

**Known limitation, stated rather than hidden.** The six workshop before/after slots ship as visible placeholders. That is the designed behaviour, not an incomplete task — the page is honest about having empty slots, which is the point of the integrity line in spec §8.4.

---

## Appendix A — shared header and mobile menu

Identical on all four pages. The only difference is which link carries
`aria-current="page"`. Paste verbatim; do not retype from another file.

```html
  <header class="site-header">
    <div class="container site-header__inner">
      <a class="wordmark" href="/">Yosef Pilip</a>
      <nav class="nav-desktop" aria-label="Primary">
        <a href="/">Home</a>
        <a href="/projects.html">Projects</a>
        <a href="/music.html">DJ &amp; Music</a>
        <a href="/workshop.html">Workshop</a>
      </nav>
      <button class="menu-toggle" id="menuOpen" aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="17" x2="21" y2="17"/></svg>
      </button>
    </div>
  </header>

  <div class="mobile-menu" id="mobileMenu">
    <button class="mobile-menu__close" id="menuClose" aria-label="Close menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
    </button>
    <a href="/">Home</a>
    <a href="/projects.html">Projects</a>
    <a href="/music.html">DJ &amp; Music</a>
    <a href="/workshop.html">Workshop</a>
  </div>
```

## Appendix B — shared footer

```html
  <footer class="site-footer">
    <div class="container site-footer__inner">
      <span class="meta">&copy; 2026 Yosef Pilip</span>
      <span class="meta">Built by hand</span>
    </div>
  </footer>
```

## Appendix C — shared `<head>`

Swap only the four marked values per page.

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><!-- PAGE TITLE --></title>
  <meta name="description" content="<!-- PAGE DESCRIPTION -->" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="<!-- /src/styles/PAGE.css -->" />
</head>
```

| Page | Title | Stylesheet | Entry |
|---|---|---|---|
| Home | `Yosef Pilip` | `/src/styles/home.css` | `/src/main.tsx` |
| Projects | `Projects — Yosef Pilip` | `/src/styles/projects.css` | `/src/entries/projects.ts` |
| Music | `DJ & Music — Yosef Pilip` | `/src/styles/music.css` | `/src/entries/music.tsx` |
| Workshop | `Workshop — Yosef Pilip` | `/src/styles/workshop.css` | `/src/entries/workshop.ts` |
| Cache It | `Cache It — Yosef Pilip` | `/src/styles/case-study.css` | `/src/entries/case-study.ts` |
