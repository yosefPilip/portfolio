# Vite + React Migration — Design

## Context

The portfolio is currently a single hand-written `index.html` (vanilla HTML/CSS/JS) with a dark "bio-terminal" theme (lime/amber accents, glass cards, Space Mono/Outfit fonts), deployed on Vercel with no build step.

The user wants to be able to copy-paste flashy React/Tailwind component libraries (Aceternity, Magic UI, shadcn, etc.) into the site going forward — starting with a split-flap "flip board" loading intro (separate follow-up spec). That requires a real build pipeline. This spec covers migrating the existing site to Vite + React + TypeScript + Tailwind as a **faithful 1:1 port** — same content, same design, same behavior, just restructured. No visual or content changes, and no new animation/UI libraries are introduced yet (added later only when a specific copied component needs them).

## Goals

- Preserve the site exactly as it looks and behaves today.
- Restructure markup into React components, organized by responsibility.
- Move copy/content (experience, projects, education, skills, contact) into typed data files.
- Add Tailwind CSS as a styling layer on top of the existing CSS custom-property theme (not a replacement for it), so future Tailwind-based components drop in with minimal translation.
- Keep the build deployable to Vercel with zero repo-side config (Vercel auto-detects Vite).

## Non-goals

- No redesign, no new sections, no copy changes.
- No new animation/UI libraries (framer-motion, shadcn, etc.) — added later only when needed.
- No test framework — none exists today; out of scope for a like-for-like port.
- No intro animation — that's a separate follow-up spec, built on top of this foundation.

## Tooling

- **Scaffold:** `npm create vite@latest` with the `react-ts` template.
- **Styling:** Tailwind CSS + PostCSS + Autoprefixer.
- **Package manager:** npm (matches no existing preference; simplest default).
- **Linting:** Vite's default `react-ts` template ESLint config, unmodified.

## Project structure

```
portfolio/
  index.html                 # Vite app shell (root div + script tag), fonts preconnect/link
  vite.config.ts
  tailwind.config.ts
  postcss.config.js
  tsconfig.json
  package.json
  src/
    main.tsx
    App.tsx
    index.css               # Tailwind directives + :root CSS variables + custom keyframe utilities
    components/
      layout/
        Header.tsx           # wordmark, desktop nav, mobile menu toggle, eq-bars
        MobileMenu.tsx
        SideRail.tsx         # hover-expand side nav
        Footer.tsx
        GrainOverlay.tsx
      sections/
        Hero.tsx
        Experience.tsx
        Projects.tsx
        Education.tsx
        Skills.tsx
        Contact.tsx
      ui/
        Button.tsx           # btn-primary / btn-ghost variants
        Tag.tsx
        Chip.tsx
        RevealOnScroll.tsx   # wraps children, applies useScrollReveal
    hooks/
      useScrollReveal.ts     # IntersectionObserver -> visible state (replaces .reveal/.visible)
      useActiveSection.ts    # IntersectionObserver -> active nav id
      useParallax.ts         # hero bg scroll offset, respects prefers-reduced-motion
      useTilt.ts             # mousemove tilt on cards, skipped on touch/reduced-motion
    data/
      experience.ts
      projects.ts
      education.ts
      skills.ts
      contact.ts
    types/
      content.ts             # shared TS types for the data files above
```

## Styling strategy

- All existing CSS custom properties (`--bg`, `--lime`, `--amber`, `--font-body`, `--font-mono`, etc.) stay defined once in `src/index.css` under `:root`.
- `tailwind.config.ts` extends `theme.colors`/`theme.fontFamily` to reference those same variables (e.g. `lime: 'var(--lime)'`), so both `bg-lime`/`text-amber` Tailwind utilities and any remaining hand-written CSS share one source of truth.
- Simple keyframe animations (pulse-dot, blink, flicker, eq-bar pulse) move into Tailwind's `theme.extend.keyframes`/`animation`.
- The staggered eq-bar delays and the reveal-on-scroll opacity/transform transition stay as small `@layer utilities` CSS, since Tailwind's animation config doesn't cleanly express per-child animation-delay staggering.
- `.glass` (backdrop-blur card style) becomes a reusable utility class via `@layer components`.

## Interactivity (1:1 behavior port)

| Current vanilla JS | React equivalent |
|---|---|
| `IntersectionObserver` + `.reveal.visible` toggle | `useScrollReveal` hook + `RevealOnScroll` wrapper component |
| `IntersectionObserver` for active nav link | `useActiveSection` hook, drives `aria-current`/active class on nav links |
| Mobile menu open/close listeners | Local `useState` in `Header`/`MobileMenu` |
| Scroll-driven hero parallax (`heroBg.style.transform`) | `useParallax` hook, same reduced-motion guard |
| Mousemove card tilt | `useTilt` hook, same touch/reduced-motion guard |
| `scroll-behavior: smooth` + close mobile menu on nav click | Kept as native CSS; `onClick` handler on nav links just closes the mobile menu |

No behavior changes — each hook reproduces the exact current effect.

## Content data layer

Experience, project, education, skill-group, and contact entries move into typed arrays in `src/data/*.ts`, typed via `src/types/content.ts`. Section components map over the arrays to render cards/rows. This is a pure refactor of the current hard-coded markup — no copy changes.

## Deployment

- Vercel auto-detects the Vite framework preset (`npm run build` → `dist/`), no `vercel.json` needed.
- Manual step on the user's end (outside this repo): repoint the existing Vercel project's build settings from "static site" to the new Vite build, or reconnect if needed. Not something this migration can do from the repo alone.

## Out of scope / follow-up

- The split-flap "flip board" loading intro animation is a separate design, to be brainstormed once this migration is implemented and verified.
