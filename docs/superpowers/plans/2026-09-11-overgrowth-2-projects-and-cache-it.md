# Overgrowth 2 — Projects & Cache It Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Projects index with three depths of detail — collapsed row, expand-in-place, and a full case study that owns a real URL — and write the Cache It case study.

**Architecture:** Project rows are **real HTML in `projects.html`**, so the page works with no JavaScript and is fully indexable. A vanilla TypeScript enhancer layers filtering and expand-in-place on top. Each case study is also a **real page** (`projects/cache-it.html`); clicking through fetches that page, lifts its `<main>` into an animated overlay, and pushes the URL with `history.pushState`. Cold-loading the same URL serves the real page. No router, no SPA conversion.

**Tech Stack:** Vite 8 multi-page build, TypeScript 6, Vitest + jsdom, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-11-portfolio-overgrowth-rebuild-design.md`

**Plan 2 of 3.** Requires Plan 1 complete — it consumes `tokens.css`, `base.css`, `stack.css`, `initChrome()`, `initMotion()`, and the guard helpers.

---

## Global Constraints

All of Plan 1's Global Constraints apply unchanged. Additionally:

- **Room is `projects`** on both the index and every case study: `<body data-room="projects">`.
- **No six-layer hero.** The six-layer stack is Home's one signature move (spec §7). Project pages get three-layer stacks only.
- **Tier 2 stays short** — one paragraph, the stack, two links. If tier 2 grows long, nobody clicks into tier 3 (spec §9).
- **Project order is fixed** and must not be reordered: Cache It, Batch Podcast Generator, Resell Assistant (MCP), CloudGeometry internal tools, DJ Music Sorter, This site.
- **Cache It is NFC**, with an upgrade path to NTAG 424 DNA chips. It is **not** image recognition. Any copy claiming otherwise is a spec violation (spec §1, §10).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/data/projects.ts` | The six projects as typed data. Single source for order, slugs, categories. |
| `src/lib/projectFilter.ts` | Filter and count. Pure. |
| `src/lib/caseStudyRoute.ts` | Slug ↔ URL mapping. Pure. |
| `src/shared/projectsIndex.ts` | Filter pills and expand-in-place wiring. |
| `src/shared/caseStudy.ts` | Overlay fetch, pushState, popstate, focus handling. |
| `src/styles/projects.css` | Index page: rows, pills, expansion, ridge hero. |
| `src/styles/case-study.css` | Case study page and overlay shell, including the left rail. |
| `projects.html` | Index. Full rewrite. |
| `projects/cache-it.html` | The flagship case study. |
| `vercel.json` | Clean URLs so `/projects/cache-it` serves the `.html`. |

---

### Task 1: Project data and filtering

**Files:**
- Create: `src/data/projects.ts`
- Create: `src/lib/projectFilter.ts`
- Create: `tests/projects-data.test.ts`
- Create: `tests/projectFilter.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type ProjectCategory = 'ai' | 'fullstack' | 'tools'`; `interface Project { slug, title, hook, category, year, stack, hasCaseStudy, href? }`; `PROJECTS: readonly Project[]` from `src/data/projects.ts`. `filterProjects(projects, category): Project[]` and `countByCategory(projects): Record<string, number>` from `src/lib/projectFilter.ts`. Task 2 renders from `PROJECTS`; Task 3 reads `category`.

- [ ] **Step 1: Write the failing data test**

Create `tests/projects-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PROJECTS } from '../src/data/projects';

describe('PROJECTS', () => {
  it('holds the six projects in the order the spec fixes', () => {
    expect(PROJECTS.map((p) => p.slug)).toEqual([
      'cache-it',
      'podcast-generator',
      'resell-assistant',
      'cloudgeometry',
      'music-sorter',
      'portfolio',
    ]);
  });

  it('gives every project a title, hook, category, year and stack', () => {
    for (const p of PROJECTS) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.hook.length).toBeGreaterThan(0);
      expect(['ai', 'fullstack', 'tools']).toContain(p.category);
      expect(p.year.length).toBeGreaterThan(0);
      expect(p.stack.length).toBeGreaterThan(0);
    }
  });

  it('has unique slugs', () => {
    expect(new Set(PROJECTS.map((p) => p.slug)).size).toBe(PROJECTS.length);
  });

  it('ships exactly one case study at launch — Cache It', () => {
    const withStudies = PROJECTS.filter((p) => p.hasCaseStudy);
    expect(withStudies.map((p) => p.slug)).toEqual(['cache-it']);
  });

  it('never describes Cache It as image recognition', () => {
    const cacheIt = PROJECTS.find((p) => p.slug === 'cache-it')!;
    expect(cacheIt.hook.toLowerCase()).not.toContain('recognition');
    expect(cacheIt.stack.join(' ')).toContain('NFC');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../src/data/projects"`.

- [ ] **Step 3: Write the data module**

Create `src/data/projects.ts`:

```ts
export type ProjectCategory = 'ai' | 'fullstack' | 'tools';

export interface Project {
  slug: string;
  title: string;
  /** One line. Shown on the collapsed row. */
  hook: string;
  category: ProjectCategory;
  year: string;
  stack: readonly string[];
  /** True only when a real tier-3 page exists at /projects/<slug>. */
  hasCaseStudy: boolean;
  /** External link, when there is something live to look at. */
  live?: string;
}

/** Order is fixed by the spec and must not be changed. */
export const PROJECTS: readonly Project[] = [
  {
    slug: 'cache-it',
    title: 'Cache It',
    hook: 'Hidden art around a city. Find it, tap it, keep it.',
    category: 'fullstack',
    year: '2026',
    stack: ['React', 'Vite', 'FastAPI', 'NFC', 'NTAG 424 DNA'],
    hasCaseStudy: true,
    live: 'https://cache-it-one.vercel.app',
  },
  {
    slug: 'podcast-generator',
    title: 'Batch Podcast Generator',
    hook: '100-episode runs from a prompt, without melting the API.',
    category: 'ai',
    year: '2026',
    stack: ['Python', 'Anthropic API', 'SQLite', 'Vercel'],
    hasCaseStudy: false,
  },
  {
    slug: 'resell-assistant',
    title: 'Resell Assistant',
    hook: 'Ask what a thing is worth. It answers, then updates the books.',
    category: 'ai',
    year: 'In development',
    stack: ['MCP', 'Google Sheets API', 'OAuth 2.0'],
    hasCaseStudy: false,
  },
  {
    slug: 'cloudgeometry',
    title: 'CloudGeometry internal tools',
    hook: 'The Slack bot, the HR platform, and the thing that audits everyone’s account.',
    category: 'ai',
    year: '2025–',
    stack: ['Python', 'Gemini API', 'Apps Script', 'AppSheet', 'Admin SDK'],
    hasCaseStudy: false,
  },
  {
    slug: 'music-sorter',
    title: 'DJ Music Sorter',
    // OPEN: owner has not supplied what it sorts or by what. Ships as a dash.
    hook: '—',
    category: 'tools',
    year: 'Being built',
    stack: ['—'],
    hasCaseStudy: false,
  },
  {
    slug: 'portfolio',
    title: 'This site',
    hook: 'Four rooms, one building. Scroll-linked depth, hand-built.',
    category: 'fullstack',
    year: '2026',
    stack: ['Vite', 'TypeScript', 'React', 'Lenis'],
    hasCaseStudy: false,
    live: 'https://github.com/yosefPilip',
  },
];
```

- [ ] **Step 4: Write the failing filter test**

Create `tests/projectFilter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterProjects, countByCategory } from '../src/lib/projectFilter';
import { PROJECTS } from '../src/data/projects';

describe('filterProjects', () => {
  it('returns everything for "all"', () => {
    expect(filterProjects(PROJECTS, 'all')).toHaveLength(PROJECTS.length);
  });

  it('returns only the matching category', () => {
    const ai = filterProjects(PROJECTS, 'ai');
    expect(ai.length).toBeGreaterThan(0);
    expect(ai.every((p) => p.category === 'ai')).toBe(true);
  });

  it('preserves the fixed order', () => {
    const all = filterProjects(PROJECTS, 'all');
    expect(all.map((p) => p.slug)).toEqual(PROJECTS.map((p) => p.slug));
  });

  it('returns an empty array for a category nothing matches', () => {
    expect(filterProjects([], 'ai')).toEqual([]);
  });
});

describe('countByCategory', () => {
  it('counts all and each category', () => {
    const counts = countByCategory(PROJECTS);
    expect(counts.all).toBe(PROJECTS.length);
    expect(counts.ai + counts.fullstack + counts.tools).toBe(PROJECTS.length);
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../src/lib/projectFilter"`.

- [ ] **Step 6: Write the filter module**

Create `src/lib/projectFilter.ts`:

```ts
import type { Project, ProjectCategory } from '../data/projects';

export type FilterValue = ProjectCategory | 'all';

export function filterProjects(
  projects: readonly Project[],
  category: FilterValue,
): Project[] {
  if (category === 'all') return [...projects];
  return projects.filter((p) => p.category === category);
}

export function countByCategory(
  projects: readonly Project[],
): Record<FilterValue, number> {
  const counts: Record<FilterValue, number> = { all: projects.length, ai: 0, fullstack: 0, tools: 0 };
  for (const p of projects) counts[p.category] += 1;
  return counts;
}
```

- [ ] **Step 7: Run and commit**

Run: `npm test && npx tsc -b --noEmit`
Expected: PASS, no type errors.

```bash
git add src/data/projects.ts src/lib/projectFilter.ts tests/projects-data.test.ts tests/projectFilter.test.ts
git commit -m "feat: add project data model and category filtering"
```

---

### Task 2: Projects index page and ridge hero

**Files:**
- Modify: `projects.html` (full rewrite)
- Create: `src/styles/projects.css`
- Modify: `vite.config.ts`
- Create: `tests/projects-page.test.ts`

**Interfaces:**
- Consumes: `PROJECTS` (Task 1), `base.css`/`stack.css`/`initChrome`/`initMotion` (Plan 1).
- Produces: `.work-row[data-slug][data-category]` markup that Tasks 3 and 4 attach behaviour to, and `#projects-entry` as the page's script entry.

**Rows are hand-written HTML, not rendered from `PROJECTS` at runtime.** The data module is the source of truth for order and categories, and the test below asserts the HTML agrees with it — that keeps the page indexable and no-JS-safe while still catching drift.

- [ ] **Step 1: Write the failing page test**

Create `tests/projects-page.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PROJECTS } from '../src/data/projects';
import { findForbiddenCopy } from '../src/lib/guards';

const html = readFileSync('projects.html', 'utf8');

describe('projects.html', () => {
  it('declares the projects room', () => {
    expect(html).toMatch(/<body[^>]*data-room="projects"/);
  });

  it('renders every project as a real row, in the fixed order', () => {
    const slugs = Array.from(html.matchAll(/data-slug="([a-z-]+)"/g)).map((m) => m[1]);
    expect(slugs).toEqual(PROJECTS.map((p) => p.slug));
  });

  it('tags each row with the category its data says', () => {
    for (const p of PROJECTS) {
      const row = html.match(new RegExp(`data-slug="${p.slug}"[^>]*`))![0];
      expect(row).toContain(`data-category="${p.category}"`);
    }
  });

  it('does not repeat the six-layer hero', () => {
    for (const layer of ['plate--canopy', 'plate--trunks', 'plate--name']) {
      expect(html).not.toContain(layer);
    }
  });

  it('carries no banned copy', () => {
    expect(findForbiddenCopy(html)).toEqual([]);
  });

  it('offers all four filters', () => {
    for (const value of ['all', 'ai', 'fullstack', 'tools']) {
      expect(html).toContain(`data-filter="${value}"`);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — the old page has `Sector_02`, no `data-room`, no rows.

- [ ] **Step 3: Rewrite `projects.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Projects — Yosef Pilip</title>
  <meta name="description" content="Things I've built: Cache It, a batch podcast generator, an MCP resale assistant, and the internal tools behind a 100-person company." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/src/styles/projects.css" />
</head>
<body data-room="projects">

  <div class="grain" aria-hidden="true"></div>

  <header class="site-header">
    <div class="container site-header__inner">
      <a class="wordmark" href="/">Yosef Pilip</a>
      <nav class="nav-desktop" aria-label="Primary">
        <a href="/">Home</a>
        <a href="/projects.html" aria-current="page">Projects</a>
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

  <main>

    <!-- ── RIDGE HERO: three layers, not six ── -->
    <section class="stack page-hero">
      <div class="stack-view">
        <div class="plate plate--back">
          <figure class="frame" style="--ar: 3 / 2; height: 100%;" data-label="Projects L1 — ridge-far">
            <img src="/assets/img/ridge-far.webp" alt="" loading="eager" />
          </figure>
        </div>
        <div class="plate plate--copy">
          <h1 class="display">Projects</h1>
          <p class="lede">Six things, roughly in the order I care about them.</p>
        </div>
        <div class="plate plate--front">
          <figure class="frame" style="--ar: 3 / 2; height: 100%;" data-label="Projects L3 — ridge-near">
            <img src="/assets/img/ridge-near.webp" alt="" loading="eager" />
          </figure>
        </div>
      </div>
    </section>

    <section class="section" id="index">
      <div class="container">

        <div class="filters" role="group" aria-label="Filter projects">
          <button class="pill is-active" data-filter="all" aria-pressed="true">All</button>
          <button class="pill" data-filter="ai" aria-pressed="false">AI &amp; automation</button>
          <button class="pill" data-filter="fullstack" aria-pressed="false">Full-stack</button>
          <button class="pill" data-filter="tools" aria-pressed="false">Tools</button>
          <span class="meta" id="filterCount">6 projects</span>
        </div>

        <div class="work-list" id="projectList">

          <article class="work-item" data-slug="cache-it" data-category="fullstack" id="cache-it">
            <button class="work-row work-row--button" aria-expanded="false">
              <span class="work-row__year meta">2026</span>
              <span class="work-row__name">Cache It</span>
              <span class="work-row__hook">Hidden art around a city. Find it, tap it, keep it.</span>
              <span class="work-row__go" aria-hidden="true">+</span>
            </button>
            <div class="work-detail" hidden>
              <p>A geocaching-style hunt for street art. An artist hides a piece somewhere in the city, you go and find it, and you tap your phone against it to collect it into your own portfolio. I designed and built the whole thing — React and Vite on the front, FastAPI behind it.</p>
              <p class="meta">React &middot; Vite &middot; FastAPI &middot; NFC &middot; NTAG 424 DNA</p>
              <p class="work-detail__links">
                <a class="link" href="/projects/cache-it">Read the case study &rarr;</a>
                <a class="link" href="https://cache-it-one.vercel.app" target="_blank" rel="noopener">Live site &#8599;</a>
              </p>
            </div>
          </article>

          <article class="work-item" data-slug="podcast-generator" data-category="ai" id="podcast-generator">
            <button class="work-row work-row--button" aria-expanded="false">
              <span class="work-row__year meta">2026</span>
              <span class="work-row__name">Batch Podcast Generator</span>
              <span class="work-row__hook">100-episode runs from a prompt, without melting the API.</span>
              <span class="work-row__go" aria-hidden="true">+</span>
            </button>
            <div class="work-detail" hidden>
              <p>Give it a prompt, get back a whole batch of podcast episodes. Scripts come from the Anthropic API; the voices come from a pluggable TTS adapter layer, so swapping Fish Audio for ElevenLabs is a config change rather than a rewrite. The interesting part is the concurrency — a 100-episode run is bounded by an asyncio semaphore so it saturates without falling over. SQLite behind it, deployed on Vercel.</p>
              <p class="meta">Python &middot; Anthropic API &middot; SQLite &middot; Vercel</p>
            </div>
          </article>

          <article class="work-item" data-slug="resell-assistant" data-category="ai" id="resell-assistant">
            <button class="work-row work-row--button" aria-expanded="false">
              <span class="work-row__year meta">In development</span>
              <span class="work-row__name">Resell Assistant</span>
              <span class="work-row__hook">Ask what a thing is worth. It answers, then updates the books.</span>
              <span class="work-row__go" aria-hidden="true">+</span>
            </button>
            <div class="work-detail" hidden>
              <p>A custom MCP server for my own reselling. You ask it a pricing question in plain language and it answers, then keeps a live financial and inventory tracker in Google Sheets up to date without me touching it. Auth is per-user OAuth rather than one shared credential, so it can be handed to someone else without handing over my account.</p>
              <p class="meta">MCP &middot; Google Sheets API &middot; OAuth 2.0</p>
              <p class="work-detail__links"><a class="link" href="/workshop.html">Why it exists &rarr;</a></p>
            </div>
          </article>

          <article class="work-item" data-slug="cloudgeometry" data-category="ai" id="cloudgeometry">
            <button class="work-row work-row--button" aria-expanded="false">
              <span class="work-row__year meta">2025&ndash;</span>
              <span class="work-row__name">CloudGeometry internal tools</span>
              <span class="work-row__hook">The Slack bot, the HR platform, and the thing that audits everyone&rsquo;s account.</span>
              <span class="work-row__go" aria-hidden="true">+</span>
            </button>
            <div class="work-detail" hidden>
              <p><strong>The Slack bot.</strong> Nobody should have to write a formal email to say they&rsquo;re sick. Now they tell Slack in whatever words they&rsquo;d actually use, and the bot works out what they meant, files it as a real record, and routes it to their manager. Three days became same-day, for about 100 people.</p>
              <p><strong>The HR platform.</strong> A four-tier permission model, and an internal HR app built on top of it. It replaced a paid third-party tool and saves $8,000 a year.</p>
              <p><strong>The auditor.</strong> A scheduled Apps Script service that checks every account for 2FA, recovery info and profile photos, then logs what it finds. It replaced 40 hours a month of manual review across ~100 accounts.</p>
              <p class="meta">Python &middot; Gemini API &middot; Apps Script &middot; AppSheet &middot; Admin SDK</p>
            </div>
          </article>

          <article class="work-item" data-slug="music-sorter" data-category="tools" id="music-sorter">
            <button class="work-row work-row--button" aria-expanded="false">
              <span class="work-row__year meta">Being built</span>
              <span class="work-row__name">DJ Music Sorter</span>
              <!-- OPEN: owner has not said what it sorts or by what -->
              <span class="work-row__hook">&mdash;</span>
              <span class="work-row__go" aria-hidden="true">+</span>
            </button>
            <div class="work-detail" hidden>
              <!-- OPEN: one line on what it sorts and by what -->
              <p>&mdash;</p>
              <p class="meta">In progress</p>
            </div>
          </article>

          <article class="work-item" data-slug="portfolio" data-category="fullstack" id="portfolio">
            <button class="work-row work-row--button" aria-expanded="false">
              <span class="work-row__year meta">2026</span>
              <span class="work-row__name">This site</span>
              <span class="work-row__hook">Four rooms, one building. Scroll-linked depth, hand-built.</span>
              <span class="work-row__go" aria-hidden="true">+</span>
            </button>
            <div class="work-detail" hidden>
              <p>A Vite multi-page build, no framework driving the layout. The green lives in the photography and the interface stays out of its way. Every page is a different setting, and one scroll-progress value drives the layers on all of them — so the hero&rsquo;s trunks can slide across my name instead of sitting on top of it.</p>
              <p class="meta">Vite &middot; TypeScript &middot; React &middot; Lenis</p>
              <p class="work-detail__links"><a class="link" href="https://github.com/yosefPilip" target="_blank" rel="noopener">Source &#8599;</a></p>
            </div>
          </article>

        </div>
      </div>
    </section>

  </main>

  <footer class="site-footer">
    <div class="container site-footer__inner">
      <span class="meta">&copy; 2026 Yosef Pilip</span>
      <span class="meta">Built by hand</span>
    </div>
  </footer>

  <div class="cs-overlay" id="csOverlay" hidden aria-modal="true" role="dialog" aria-label="Case study"></div>

  <script type="module" src="/src/entries/projects.ts" id="projects-entry"></script>

</body>
</html>
```

- [ ] **Step 4: Create the page entry**

Create `src/entries/projects.ts`:

```ts
// Stylesheets are loaded by the <link> in the HTML, not imported here —
// importing as well would ship the same CSS twice.
import { initChrome } from '../shared/chrome';
import { initMotion } from '../shared/motion';

initChrome();
initMotion();
```

- [ ] **Step 5: Create the index stylesheet**

Create `src/styles/projects.css`:

```css
@import './base.css';
@import './stack.css';
@import './chrome.css';

/* Page heroes are three layers. Six belongs to Home alone. */
.page-hero { --stack-h: 180vh; }
.page-hero .plate--copy { text-align: center; }
.page-hero .display { color: var(--fg); }
.page-hero .lede { margin-inline: auto; }

/* ── filters ── */
.filters { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: clamp(24px, 3vw, 44px); }
.pill {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  padding: 8px 15px;
  border-radius: 99px;
  border: 1px solid var(--border-strong);
  background: none;
  color: var(--fg-dim);
  cursor: pointer;
  transition: background-color 0.16s ease, color 0.16s ease;
}
.pill:hover { color: var(--fg); }
/* The active filter is a selected state, not an action — so it is the one
   place --accent-2 is allowed to be a fill. */
.pill.is-active { background: var(--accent-2); border-color: var(--accent-2); color: var(--bg-deep); }
.pill:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.filters .meta { margin-left: auto; }

/* ── rows ── */
.work-list { border-top: 1px solid var(--border); }
.work-item { border-bottom: 1px solid var(--border); }
.work-item[hidden] { display: none; }

.work-row--button {
  display: grid;
  grid-template-columns: 7rem 1fr auto;
  gap: 6px 24px;
  align-items: baseline;
  width: 100%;
  padding-block: clamp(20px, 2.4vw, 32px);
  background: none;
  border: 0;
  text-align: left;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.work-row--button:hover { background: color-mix(in oklab, var(--fg) 4%, transparent); }
.work-row--button:hover .work-row__year { color: var(--accent-2); }
.work-row--button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.work-row__name { font-family: var(--font-display); font-size: var(--step-h2); }
.work-row__hook { grid-column: 2; color: var(--fg-dim); }
.work-row__go { color: var(--accent); font-size: 22px; line-height: 1; transition: transform 0.2s ease; }
.work-row--button[aria-expanded='true'] .work-row__go { transform: rotate(45deg); }

.work-detail { padding-bottom: clamp(24px, 3vw, 40px); max-width: 62ch; }
.work-detail p + p { margin-top: 0.9em; }
.work-detail__links { display: flex; gap: 22px; margin-top: 16px; }
.link { color: var(--accent); }
.link:hover { color: var(--accent-press); }

@media (max-width: 700px) {
  .work-row--button { grid-template-columns: 1fr auto; }
  .work-row__year { grid-column: 1; }
  .work-row__hook { grid-column: 1 / -1; }
}
```

- [ ] **Step 6: Extract shared chrome styles**

Move the `.site-header`, `.wordmark`, `.nav-desktop`, `.menu-toggle`, `.mobile-menu`, `.site-footer` and `.spec`/`.link` rules out of `src/styles/home.css` into a new `src/styles/chrome.css` (starting with `@import './tokens.css';`), and replace them in `home.css` with `@import './chrome.css';`. Four pages need them; they should not be duplicated.

- [ ] **Step 7: Register the page in Vite**

In `vite.config.ts`, the `input` map already lists `projects`. Confirm it points at `resolve(__dirname, 'projects.html')`. No change needed yet — `projects/cache-it.html` is added in Task 5.

- [ ] **Step 8: Run and commit**

Run: `npm test && npx tsc -b --noEmit && npm run build`
Expected: PASS, clean build.

```bash
git add projects.html src/entries/projects.ts src/styles/projects.css src/styles/chrome.css src/styles/home.css tests/projects-page.test.ts
git commit -m "feat: rebuild the projects index with real rows and a ridge hero"
```

---

### Task 3: Filtering and expand-in-place

**Files:**
- Create: `src/shared/projectsIndex.ts`
- Create: `tests/projectsIndex.test.ts`
- Modify: `src/entries/projects.ts`

**Interfaces:**
- Consumes: `.work-item[data-category]`, `.work-row--button[aria-expanded]`, `.work-detail[hidden]`, `.pill[data-filter]`, `#filterCount` from Task 2. `filterProjects`/`countByCategory` from Task 1.
- Produces: `initProjectsIndex(root: Document | HTMLElement): void` from `src/shared/projectsIndex.ts`.

- [ ] **Step 1: Write the failing test**

Create `tests/projectsIndex.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { initProjectsIndex } from '../src/shared/projectsIndex';

function build(): void {
  document.body.innerHTML = `
    <div class="filters">
      <button class="pill is-active" data-filter="all" aria-pressed="true">All</button>
      <button class="pill" data-filter="ai" aria-pressed="false">AI</button>
      <span class="meta" id="filterCount">3 projects</span>
    </div>
    <div class="work-list" id="projectList">
      <article class="work-item" data-slug="a" data-category="ai">
        <button class="work-row--button" aria-expanded="false"></button>
        <div class="work-detail" hidden></div>
      </article>
      <article class="work-item" data-slug="b" data-category="fullstack">
        <button class="work-row--button" aria-expanded="false"></button>
        <div class="work-detail" hidden></div>
      </article>
      <article class="work-item" data-slug="c" data-category="ai">
        <button class="work-row--button" aria-expanded="false"></button>
        <div class="work-detail" hidden></div>
      </article>
    </div>`;
}

const items = () => Array.from(document.querySelectorAll<HTMLElement>('.work-item'));
const visible = () => items().filter((el) => !el.hidden);

beforeEach(() => { build(); initProjectsIndex(document); });

describe('expand in place', () => {
  it('opens a row on click', () => {
    const button = document.querySelector<HTMLButtonElement>('.work-row--button')!;
    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector<HTMLElement>('.work-detail')!.hidden).toBe(false);
  });

  it('closes it again on a second click', () => {
    const button = document.querySelector<HTMLButtonElement>('.work-row--button')!;
    button.click();
    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector<HTMLElement>('.work-detail')!.hidden).toBe(true);
  });

  it('lets several rows be open at once', () => {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.work-row--button');
    buttons[0].click();
    buttons[1].click();
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
  });
});

describe('filtering', () => {
  it('shows only the chosen category', () => {
    document.querySelector<HTMLButtonElement>('[data-filter="ai"]')!.click();
    expect(visible().map((el) => el.dataset.slug)).toEqual(['a', 'c']);
  });

  it('moves the active pill and its aria-pressed state', () => {
    const ai = document.querySelector<HTMLButtonElement>('[data-filter="ai"]')!;
    ai.click();
    expect(ai.classList.contains('is-active')).toBe(true);
    expect(ai.getAttribute('aria-pressed')).toBe('true');
    const all = document.querySelector<HTMLButtonElement>('[data-filter="all"]')!;
    expect(all.classList.contains('is-active')).toBe(false);
    expect(all.getAttribute('aria-pressed')).toBe('false');
  });

  it('updates the live count, singular and plural', () => {
    document.querySelector<HTMLButtonElement>('[data-filter="ai"]')!.click();
    expect(document.getElementById('filterCount')!.textContent).toBe('2 projects');
    document.querySelector<HTMLButtonElement>('[data-filter="all"]')!.click();
    expect(document.getElementById('filterCount')!.textContent).toBe('3 projects');
  });

  it('collapses any open row when the filter changes', () => {
    const button = document.querySelector<HTMLButtonElement>('.work-row--button')!;
    button.click();
    document.querySelector<HTMLButtonElement>('[data-filter="ai"]')!.click();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('restores everything on "all"', () => {
    document.querySelector<HTMLButtonElement>('[data-filter="ai"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-filter="all"]')!.click();
    expect(visible()).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../src/shared/projectsIndex"`.

- [ ] **Step 3: Write the implementation**

Create `src/shared/projectsIndex.ts`:

```ts
/**
 * Tier 1 → tier 2: filter pills and expand-in-place.
 *
 * Works against markup that is already in the HTML, so the page is complete
 * without JavaScript and this only ever enhances it.
 */
export function initProjectsIndex(root: Document | HTMLElement): void {
  const items = Array.from(root.querySelectorAll<HTMLElement>('.work-item'));
  const pills = Array.from(root.querySelectorAll<HTMLButtonElement>('.pill[data-filter]'));
  const count = root.querySelector<HTMLElement>('#filterCount');

  function collapse(item: HTMLElement): void {
    const button = item.querySelector<HTMLButtonElement>('.work-row--button');
    const detail = item.querySelector<HTMLElement>('.work-detail');
    button?.setAttribute('aria-expanded', 'false');
    if (detail) detail.hidden = true;
  }

  items.forEach((item) => {
    const button = item.querySelector<HTMLButtonElement>('.work-row--button');
    const detail = item.querySelector<HTMLElement>('.work-detail');
    if (!button || !detail) return;

    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', open ? 'false' : 'true');
      detail.hidden = open;
    });
  });

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const value = pill.dataset.filter ?? 'all';

      pills.forEach((other) => {
        const active = other === pill;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
      });

      let shown = 0;
      items.forEach((item) => {
        const match = value === 'all' || item.dataset.category === value;
        item.hidden = !match;
        if (match) shown += 1;
        // A row hidden while open would reopen mid-filter looking broken.
        collapse(item);
      });

      if (count) count.textContent = `${shown} project${shown === 1 ? '' : 's'}`;
    });
  });
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test`
Expected: PASS — 9 new tests.

- [ ] **Step 5: Wire it into the page entry**

In `src/entries/projects.ts`, add:

```ts
import { initProjectsIndex } from '../shared/projectsIndex';
```

and after `initMotion();`:

```ts
initProjectsIndex(document);
```

- [ ] **Step 6: Commit**

Run: `npm test && npx tsc -b --noEmit`

```bash
git add src/shared/projectsIndex.ts src/entries/projects.ts tests/projectsIndex.test.ts
git commit -m "feat: add project filtering and expand-in-place rows"
```

---

### Task 4: Tier-3 routing — overlay that owns a real URL

**Files:**
- Create: `src/lib/caseStudyRoute.ts`
- Create: `tests/caseStudyRoute.test.ts`
- Create: `src/shared/caseStudy.ts`
- Create: `tests/caseStudy.test.ts`
- Create: `vercel.json`
- Modify: `src/entries/projects.ts`, `src/styles/projects.css`

**Interfaces:**
- Consumes: `PROJECTS` (Task 1), `#csOverlay` (Task 2).
- Produces: `slugFromPath(pathname: string): string | null`, `pathForSlug(slug: string): string`, `isCaseStudyHref(href: string): boolean` from `src/lib/caseStudyRoute.ts`; `initCaseStudyRouting(root: Document): void` from `src/shared/caseStudy.ts`.

**Why this shape:** Zip Launchpad starts Fall 2026, and being able to send someone `yosefpilip.com/projects/cache-it` and have them land directly in the case study is the whole reason tier 3 owns a URL. The overlay is the fast path; the real page is the shareable one.

- [ ] **Step 1: Write the failing route test**

Create `tests/caseStudyRoute.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { slugFromPath, pathForSlug, isCaseStudyHref } from '../src/lib/caseStudyRoute';

describe('slugFromPath', () => {
  it('reads the slug of a known case study', () => {
    expect(slugFromPath('/projects/cache-it')).toBe('cache-it');
  });

  it('tolerates a trailing slash', () => {
    expect(slugFromPath('/projects/cache-it/')).toBe('cache-it');
  });

  it('tolerates the .html form', () => {
    expect(slugFromPath('/projects/cache-it.html')).toBe('cache-it');
  });

  it('returns null for the index itself', () => {
    expect(slugFromPath('/projects.html')).toBeNull();
    expect(slugFromPath('/projects')).toBeNull();
  });

  it('returns null for a project that has no case study', () => {
    expect(slugFromPath('/projects/podcast-generator')).toBeNull();
  });

  it('returns null for an unknown slug', () => {
    expect(slugFromPath('/projects/not-a-thing')).toBeNull();
  });
});

describe('pathForSlug', () => {
  it('builds the canonical clean URL', () => {
    expect(pathForSlug('cache-it')).toBe('/projects/cache-it');
  });
});

describe('isCaseStudyHref', () => {
  it('accepts a case study link', () => {
    expect(isCaseStudyHref('/projects/cache-it')).toBe(true);
  });

  it('rejects in-page anchors and external links', () => {
    expect(isCaseStudyHref('/projects.html#cloudgeometry')).toBe(false);
    expect(isCaseStudyHref('https://cache-it-one.vercel.app')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — module missing.

- [ ] **Step 3: Write the route module**

Create `src/lib/caseStudyRoute.ts`:

```ts
import { PROJECTS } from '../data/projects';

const CASE_STUDY_SLUGS = new Set(PROJECTS.filter((p) => p.hasCaseStudy).map((p) => p.slug));

/** The slug of the case study a path addresses, or null if it addresses none. */
export function slugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([a-z0-9-]+?)(?:\.html)?\/?$/);
  if (!match) return null;
  const slug = match[1];
  return CASE_STUDY_SLUGS.has(slug) ? slug : null;
}

export function pathForSlug(slug: string): string {
  return `/projects/${slug}`;
}

export function isCaseStudyHref(href: string): boolean {
  if (!href.startsWith('/')) return false;
  return slugFromPath(href.split('#')[0].split('?')[0]) !== null;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test`
Expected: PASS — 9 new tests.

- [ ] **Step 5: Write the failing overlay test**

Create `tests/caseStudy.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initCaseStudyRouting } from '../src/shared/caseStudy';

const PAGE = `<!DOCTYPE html><html><body>
  <main><h1>Cache It</h1><p>The case study body.</p></main>
</body></html>`;

beforeEach(() => {
  document.body.innerHTML = `
    <a id="go" href="/projects/cache-it">Read the case study</a>
    <a id="ext" href="https://cache-it-one.vercel.app">Live</a>
    <div class="cs-overlay" id="csOverlay" hidden></div>`;
  history.replaceState(null, '', '/projects.html');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(PAGE, { status: 200 })));
  initCaseStudyRouting(document);
});

describe('case study overlay', () => {
  it('intercepts a case-study link and pushes the clean URL', async () => {
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(window.location.pathname).toBe('/projects/cache-it'));
  });

  it('lifts the fetched page main into the overlay', async () => {
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    const overlay = document.getElementById('csOverlay')!;
    await vi.waitFor(() => expect(overlay.textContent).toContain('The case study body.'));
    expect(overlay.hidden).toBe(false);
  });

  it('leaves external links alone', () => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.getElementById('ext')!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('closes on Escape and restores the index URL', async () => {
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    const overlay = document.getElementById('csOverlay')!;
    await vi.waitFor(() => expect(overlay.hidden).toBe(false));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(overlay.hidden).toBe(true));
  });

  it('falls back to a normal navigation when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign, pathname: '/projects.html' });
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/projects/cache-it'));
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — module missing.

- [ ] **Step 7: Write the overlay module**

Create `src/shared/caseStudy.ts`:

```ts
import { isCaseStudyHref, slugFromPath, pathForSlug } from '../lib/caseStudyRoute';

/**
 * Tier 3. A case-study link opens an animated overlay without a reload AND
 * pushes /projects/<slug> into the address bar. The same URL cold-loads as a
 * real page, so it stays shareable and indexable. Back closes the overlay.
 */
export function initCaseStudyRouting(root: Document): void {
  const overlay = root.getElementById('csOverlay');
  if (!overlay) return;

  let lastFocused: HTMLElement | null = null;

  function close(push: boolean): void {
    overlay!.hidden = true;
    overlay!.innerHTML = '';
    root.body.classList.remove('is-overlay-open');
    if (push) history.pushState({ cs: null }, '', '/projects.html');
    lastFocused?.focus();
  }

  async function open(slug: string, push: boolean): Promise<void> {
    const path = pathForSlug(slug);
    try {
      const response = await fetch(`${path}.html`);
      if (!response.ok) throw new Error(String(response.status));
      const markup = await response.text();
      const parsed = new DOMParser().parseFromString(markup, 'text/html');
      const main = parsed.querySelector('main');
      if (!main) throw new Error('no main');

      overlay!.innerHTML = '';
      const closeButton = root.createElement('button');
      closeButton.className = 'cs-close';
      closeButton.setAttribute('aria-label', 'Close case study');
      closeButton.textContent = '✕';
      closeButton.addEventListener('click', () => close(true));
      overlay!.append(closeButton, main);

      overlay!.hidden = false;
      root.body.classList.add('is-overlay-open');
      if (push) history.pushState({ cs: slug }, '', path);
      closeButton.focus();
    } catch {
      // Anything unexpected: fall back to a plain navigation rather than
      // leaving the visitor on a page whose link appeared to do nothing.
      window.location.assign(path);
    }
  }

  root.addEventListener('click', (event) => {
    const mouse = event as MouseEvent;
    if (mouse.defaultPrevented || mouse.button !== 0 || mouse.metaKey || mouse.ctrlKey || mouse.shiftKey) return;
    const anchor = (event.target as HTMLElement | null)?.closest?.('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || !isCaseStudyHref(href)) return;
    const slug = slugFromPath(href);
    if (!slug) return;
    event.preventDefault();
    lastFocused = anchor as HTMLElement;
    void open(slug, true);
  });

  root.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Escape' && !overlay.hidden) close(true);
  });

  window.addEventListener('popstate', () => {
    const slug = slugFromPath(window.location.pathname);
    if (slug) void open(slug, false);
    else if (!overlay.hidden) close(false);
  });
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npm test`
Expected: PASS — 5 new tests.

- [ ] **Step 9: Add the overlay styles**

Append to `src/styles/projects.css`:

```css
.cs-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  overflow-y: auto;
  background: var(--bg);
  animation: cs-in 0.32s ease both;
}
@keyframes cs-in { from { opacity: 0; transform: translate3d(0, 18px, 0); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .cs-overlay { animation: none; } }

.cs-close {
  position: fixed;
  top: 18px;
  right: var(--gutter);
  z-index: 101;
  width: 40px;
  height: 40px;
  border-radius: 99px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--fg);
  font-size: 15px;
  cursor: pointer;
}
.cs-close:hover { background: var(--surface-tint); }
.cs-close:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

body.is-overlay-open { overflow: hidden; }
```

- [ ] **Step 10: Add clean-URL rewriting for Vercel**

Create `vercel.json`:

```json
{
  "cleanUrls": true,
  "trailingSlash": false
}
```

`cleanUrls` makes Vercel serve `projects/cache-it.html` at `/projects/cache-it`, which is what `pathForSlug` produces and what the overlay fetches with `.html` appended.

- [ ] **Step 11: Wire it into the entry and commit**

In `src/entries/projects.ts` add:

```ts
import { initCaseStudyRouting } from '../shared/caseStudy';
```

and after `initProjectsIndex(document);`:

```ts
initCaseStudyRouting(document);
```

Run: `npm test && npx tsc -b --noEmit`

```bash
git add src/lib/caseStudyRoute.ts src/shared/caseStudy.ts src/styles/projects.css src/entries/projects.ts vercel.json tests/caseStudyRoute.test.ts tests/caseStudy.test.ts
git commit -m "feat: add tier-3 case study overlay with real pushState URLs"
```

---

### Task 5: The Cache It case study

**Files:**
- Create: `projects/cache-it.html`
- Create: `src/entries/case-study.ts`
- Create: `src/styles/case-study.css`
- Modify: `vite.config.ts`
- Create: `tests/cache-it.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: a real page at `/projects/cache-it`, whose `<main>` the overlay lifts. Plan 3 does not depend on it.

**Every fact here traces to the résumé and the live deployment.** Founder & CEO, Aug 2026 – Present, `cache-it-one.vercel.app`, React/Vite + FastAPI, Zip Launchpad starting Fall 2026, NFC with an NTAG 424 DNA upgrade path.

- [ ] **Step 1: Write the failing test**

Create `tests/cache-it.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findForbiddenCopy } from '../src/lib/guards';

const html = readFileSync('projects/cache-it.html', 'utf8');

describe('Cache It case study', () => {
  it('is a real standalone page in the projects room', () => {
    expect(html).toMatch(/<body[^>]*data-room="projects"/);
    expect(html).toContain('<main');
  });

  it('says NFC, and never claims image recognition', () => {
    expect(html).toContain('NFC');
    expect(html).toContain('NTAG 424 DNA');
    expect(html.toLowerCase()).not.toContain('image recognition');
  });

  it('carries the résumé facts', () => {
    expect(html).toContain('Zip Launchpad');
    expect(html).toContain('cache-it-one.vercel.app');
    expect(html).toContain('FastAPI');
  });

  it('has the left rail with both kinds of navigation', () => {
    expect(html).toContain('cs-rail');
    expect(html).toContain('data-rail="sections"');
    expect(html).toContain('data-rail="projects"');
  });

  it('uses exactly one three-layer stack, never the six-layer hero', () => {
    expect(html.match(/class="stack"/g) ?? []).toHaveLength(1);
    expect(html).not.toContain('plate--trunks');
  });

  it('carries no banned copy and no invented metrics', () => {
    expect(findForbiddenCopy(html)).toEqual([]);
    expect(html).not.toMatch(/\d+\s*%\s*(faster|uptime)/i);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Write the case study**

Create `projects/cache-it.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cache It — Yosef Pilip</title>
  <meta name="description" content="A geocaching-style hunt for street art. Find the piece in the real world, tap your phone against it, keep it." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/src/styles/case-study.css" />
</head>
<body data-room="projects">

  <div class="grain" aria-hidden="true"></div>

  <main class="cs">

    <aside class="cs-rail">
      <a class="cs-rail__back" href="/projects.html">&larr; All projects</a>
      <nav data-rail="sections" aria-label="Sections of this case study">
        <a href="#idea">The idea</a>
        <a href="#map">The map</a>
        <a href="#collaborators">Collaborators</a>
        <a href="#authentic">Keeping finds honest</a>
        <a href="#open">Still open</a>
      </nav>
      <nav data-rail="projects" aria-label="Other projects">
        <a href="/projects.html#podcast-generator">Batch Podcast Generator</a>
        <a href="/projects.html#resell-assistant">Resell Assistant</a>
        <a href="/projects.html#cloudgeometry">CloudGeometry tools</a>
      </nav>
    </aside>

    <div class="cs-body">

      <header class="cs-head">
        <p class="eyebrow">Case study</p>
        <h1 class="display">Cache It</h1>
        <p class="lede">Hidden art around a city. Find it, tap it, keep it.</p>
        <dl class="spec">
          <dt>Role</dt><dd>Founder &amp; CEO &mdash; designed and built it solo</dd>
          <dt>Dates</dt><dd>Aug 2026 &ndash; Present</dd>
          <dt>Stack</dt><dd>React, Vite, FastAPI, NFC</dd>
          <dt>Incubator</dt><dd>Zip Launchpad, SDSU &mdash; starting Fall 2026</dd>
          <dt>Live</dt><dd><a class="link" href="https://cache-it-one.vercel.app" target="_blank" rel="noopener">cache-it-one.vercel.app &#8599;</a></dd>
        </dl>
      </header>

      <figure class="frame cs-hero" style="--ar: 16 / 9;" data-label="Case study hero — cacheit-street">
        <img src="/assets/img/cacheit-street.webp" alt="A small pasted artwork on a weathered concrete wall, ivy climbing beside it" loading="eager" />
      </figure>

      <section id="idea" class="cs-section split-7-5">
        <div>
          <h2>The idea</h2>
          <p>An artist hides a piece somewhere in a city. You go and find it &mdash; actually go, on foot, to the wall it&rsquo;s on. Then you hold your phone against it and it lands in your collection.</p>
          <p>That&rsquo;s the whole product, and almost every decision falls out of it. The find has to happen in the real world, or none of it means anything.</p>
        </div>
        <div class="panel panel--tint">
          <h3>Constraints I set</h3>
          <ul class="ticks">
            <li>No account needed to start looking. Curiosity shouldn&rsquo;t hit a signup wall.</li>
            <li>Collecting has to work one-handed, in bad light, standing in front of a wall.</li>
            <li>Artists stay in control of their own work.</li>
            <li>A find you didn&rsquo;t actually make shouldn&rsquo;t count.</li>
          </ul>
        </div>
      </section>

      <section class="stack">
        <div class="stack-view">
          <div class="plate plate--back">
            <figure class="frame" style="--ar: 4 / 3; height: 100%;" data-label="Case study — cacheit-scan">
              <img src="/assets/img/cacheit-scan.webp" alt="A hand holding a phone up to a wall at arm's length" loading="lazy" />
            </figure>
          </div>
          <div class="plate plate--copy">
            <p class="display">You have to be there.</p>
          </div>
          <div class="plate plate--front">
            <figure class="frame" style="--ar: 3 / 2; height: 100%;" data-label="Front plate — fronds-near">
              <img src="/assets/img/fronds-near.webp" alt="" loading="lazy" />
            </figure>
          </div>
        </div>
      </section>

      <section id="map" class="cs-section split-5-7">
        <div>
          <h2>The map</h2>
        </div>
        <div>
          <p>The discovery map tracks your area in real time off geolocation, so hunting feels like hunting &mdash; you move, the map moves, and pieces near you surface as you get close.</p>
          <p>It deliberately does not just drop a pin on every artwork. A map that tells you exactly where everything is isn&rsquo;t a hunt, it&rsquo;s a shopping list.</p>
        </div>
      </section>

      <section id="collaborators" class="cs-section split-7-5">
        <div>
          <h2>Letting other artists in</h2>
          <p>Early on, every piece in the app had to come from me, which meant the collection could only grow as fast as I could work. That&rsquo;s a bad ceiling for something whose whole appeal is that there&rsquo;s more out there.</p>
          <p>So there&rsquo;s a collaborator role. An outside artist can place their own work independently &mdash; their pieces, their placements, no involvement from me. It decouples the collection growing from me shipping code, which is the difference between a demo and a thing that can actually spread through a city.</p>
        </div>
      </section>

      <section id="authentic" class="cs-section split-5-7">
        <div>
          <h2>Keeping finds honest</h2>
        </div>
        <div>
          <p>The obvious version of this is a QR code taped to the wall. It&rsquo;s also the broken version: a QR code is just a picture, and a picture can be screenshotted and sent to a group chat. Then nobody has to go anywhere.</p>
          <p>So collection runs on <strong>NFC</strong> instead &mdash; you physically tap the phone against the piece. That put me inside a real constraint set, because iOS and Web NFC disagree about a lot and neither gives you everything you&rsquo;d want.</p>
          <p>I architected around those limits with an upgrade path to <strong>NTAG 424 DNA</strong> chips, which sign each tap rather than just handing over a static payload. That&rsquo;s the difference between &ldquo;this tag exists somewhere&rdquo; and &ldquo;this person tapped this tag.&rdquo;</p>
        </div>
      </section>

      <section id="open" class="cs-section">
        <div class="panel panel--tint">
          <h2>Still open</h2>
          <p>How do you keep a hunt honest once people start sharing the answers? Locations spread by word of mouth, and a solved map is a dead map.</p>
          <p>My current thinking is that finds expire and art rotates, so the city re-randomises instead of being solved once. That&rsquo;s a bet, not a result &mdash; it isn&rsquo;t built yet, and I&rsquo;m not certain it&rsquo;s right.</p>
        </div>
      </section>

      <nav class="cs-next">
        <a class="cs-next__link" href="/projects.html#podcast-generator">
          <span class="meta">Next</span>
          <span class="cs-next__name">Batch Podcast Generator</span>
          <span class="cs-next__go" aria-hidden="true">&rarr;</span>
        </a>
      </nav>

    </div>
  </main>

  <script type="module" src="/src/entries/case-study.ts"></script>

</body>
</html>
```

- [ ] **Step 4: Create the entry and stylesheet**

Create `src/entries/case-study.ts`:

```ts
import { initChrome } from '../shared/chrome';
import { initMotion } from '../shared/motion';

initChrome();
initMotion();
```

Create `src/styles/case-study.css`:

```css
@import './base.css';
@import './stack.css';
@import './chrome.css';

.cs { display: block; padding-block: clamp(40px, 6vw, 96px); }
.cs-body { width: min(860px, 100% - 2 * var(--gutter)); margin-inline: auto; }

@media (min-width: 1100px) {
  .cs { display: grid; grid-template-columns: 232px 1fr; gap: clamp(32px, 4vw, 72px); padding-inline: var(--gutter); }
  .cs-body { width: min(860px, 100%); margin-inline: 0; }
}

/* ── the rail does double duty: sections within, and other projects ── */
.cs-rail { display: none; }
@media (min-width: 1100px) {
  .cs-rail { display: block; position: sticky; top: 32px; align-self: start; }
}
.cs-rail__back { display: block; font-size: 14px; color: var(--accent); margin-bottom: 26px; }
.cs-rail nav { display: grid; gap: 9px; padding-block: 16px; border-top: 1px solid var(--border); }
.cs-rail nav a { font-size: 14px; color: var(--muted); }
.cs-rail nav a:hover { color: var(--fg); }
.cs-rail nav[data-rail='sections'] a { color: var(--fg-dim); }

.cs-head { margin-bottom: clamp(32px, 4vw, 56px); }
.cs-head .display { margin-block: 10px 14px; }
.cs-head .spec { margin-top: 28px; }

.cs-hero { margin-bottom: clamp(40px, 5vw, 80px); }
.cs-section { padding-block: clamp(36px, 5vw, 72px); border-top: 1px solid var(--border); }
.cs-section h2 { margin-bottom: 16px; }

.ticks { display: grid; gap: 10px; margin-top: 14px; }
.ticks li { color: var(--fg-dim); padding-left: 20px; position: relative; }
.ticks li::before { content: '\2014'; position: absolute; left: 0; color: var(--accent-2); }

.cs-next { margin-top: clamp(40px, 5vw, 80px); border-top: 1px solid var(--border); }
.cs-next__link { display: grid; grid-template-columns: 1fr auto; gap: 4px 20px; align-items: center; padding-block: 28px; }
.cs-next__name { font-family: var(--font-display); font-size: var(--step-h2); grid-column: 1; }
.cs-next__link .meta { grid-column: 1; }
.cs-next__go { grid-row: 1 / -1; grid-column: 2; color: var(--accent); font-size: 26px; }
.cs-next__link:hover .cs-next__name { color: var(--accent-2); }

/* Inside the overlay the rail is redundant — the overlay has its own close. */
.cs-overlay .cs-rail { display: none; }
.cs-overlay .cs { grid-template-columns: 1fr; }
```

- [ ] **Step 5: Register the page with Vite**

In `vite.config.ts`, add to the `input` map:

```ts
        'cache-it': resolve(__dirname, 'projects/cache-it.html'),
```

- [ ] **Step 6: Run everything**

Run: `npm test && npx tsc -b --noEmit && npm run build`
Expected: PASS, and `dist/projects/cache-it.html` exists.

- [ ] **Step 7: Verify all three tiers in a browser**

Run: `npm run dev`, go to `/projects.html`, and confirm:
1. **Tier 1 → 2:** clicking a row expands it; the `+` rotates to `×`; several can be open at once; changing the filter collapses them and the count updates.
2. **Tier 2 → 3:** "Read the case study" opens the overlay with no reload, and the address bar reads `/projects/cache-it`.
3. **Back button** closes the overlay and returns to `/projects.html`. **Escape** does too.
4. **Cold load:** open `/projects/cache-it.html` directly in a new tab — the real page renders with its left rail.
5. Ctrl/Cmd-clicking the case study link still opens a new tab.

> On `vite dev` the clean URL `/projects/cache-it` (no `.html`) will 404 — that rewrite is Vercel's `cleanUrls`, applied in production. The overlay fetches `.html` explicitly so it works in dev either way. Confirm the clean URL after the first deploy.

- [ ] **Step 8: Commit**

```bash
git add projects/cache-it.html src/entries/case-study.ts src/styles/case-study.css vite.config.ts tests/cache-it.test.ts
git commit -m "feat: write the Cache It case study as a real page behind the overlay"
```

---

## Plan 2 self-review

**Spec coverage.** §8.2 Projects index → Tasks 2–3. §9 three tiers and pushState routing → Tasks 3–4. §10 Cache It case study, all ten sections → Task 5. §3.3's "active filter pill is the one place `--accent-2` fills" → Task 2 step 5. **Deferred:** the `ridge-*`, `cacheit-*` and `fronds-near` images are generated in Plan 3 Task 7; every slot renders a labelled placeholder until then.

**Known gaps carried forward:** `/workshop.html` is linked from the nav and from the Resell Assistant detail but does not exist until Plan 3. The DJ Music Sorter row ships as `—` in both hook and detail, with HTML comments naming what is missing.

**Type consistency.** `Project`/`ProjectCategory` are defined once in `src/data/projects.ts` and imported by `projectFilter.ts` and `caseStudyRoute.ts`. `FilterValue` is `ProjectCategory | 'all'` and `countByCategory` returns `Record<FilterValue, number>`, which is what the `counts.all` / `counts.ai` accesses in its test require. `slugFromPath`/`pathForSlug`/`isCaseStudyHref` match between `caseStudyRoute.ts`, its tests, and `caseStudy.ts`. `initProjectsIndex(root)` and `initCaseStudyRouting(root)` each take one argument and are called that way in `src/entries/projects.ts`.
