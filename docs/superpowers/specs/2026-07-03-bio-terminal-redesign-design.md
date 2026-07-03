# Bio-Terminal Portfolio Redesign — Design Spec

## Context

The current `index.html` is a clean, minimal, light-mode single-page portfolio with all content already finalized (hero bio, experience, projects, education, skills, contact). The user wants a full visual redesign, using a reference mockup ("BIOME_OS") as inspiration: a dark, terminal/bio-hacker aesthetic with glassmorphic cards, parallax scroll backgrounds, neon accents, and scroll-reveal animations.

This spec covers the visual/structural redesign only. Content (copy, project descriptions, experience details) stays as-is from the current site unless restructuring requires trimming.

## Goals

- Replace the current light-mode minimal look with a dark bio-terminal aesthetic, carrying over the reference's visual mechanics (glass blur cards, parallax backgrounds, scroll-reveal, neon glow, hover micro-interactions).
- Keep all real content sections (Experience, Projects, Education, Skills, Contact) — no fake/decorative-only sections.
- Keep navigation plain-English and scannable; use terminal-style jargon only for micro-copy (eyebrows, tags, log labels), not primary navigation.
- Keep the site a single dependency-light HTML file, consistent with the current site's "no frameworks" philosophy.

## Non-goals

- No content rewrite — experience/project/education/skills copy carries over from the current site.
- No backend/contact form submission — contact section stays link-based (mailto, LinkedIn, GitHub), since there's no server to receive form submissions.
- No fake system branding ("BIOME_OS") — wordmark stays "Yosef Pilip".
- No purely atmospheric/decorative sections (the reference's WETLANDS/GLADE/CORE sections) — every section maps to real information.

## Tech stack decision

**Hand-written CSS/JS, no Tailwind CDN.** The reference uses `cdn.tailwindcss.com`, which compiles Tailwind's JIT engine live in the browser via JavaScript — not intended for production use (causes a flash of unstyled content, adds an external script dependency, no monetary cost but a real reliability/performance cost). Since Tailwind is a CSS authoring convenience and imposes no visual ceiling, hand-written CSS reproduces every visual effect in the reference (glassmorphism, parallax, glow, blur, grain, hover animations) with better performance and no external framework dependency.

- **Google Fonts** (Outfit + Space Mono) kept as an external dependency — this is a lightweight, production-safe request (stylesheet + font files, no JS) and system fonts can't replicate the monospace terminal look.
- **Icons** inlined as SVG rather than pulling in Material Symbols as a font-icon CDN — avoids icon-flash-of-unstyled-content and another external font request.
- **Grain texture** generated via an inline SVG `feTurbulence` noise filter (data URI), not hotlinked from `transparenttextures.com` — removes a third external dependency and matches the "zero dependency" spirit as closely as possible.

## Visual language

**Palette** (carried directly from the reference's dark Material palette):
- Background: `#0c0f0e` / `#121414` (surface-container-lowest / surface)
- Primary accent (tertiary): `#a4d64c` (lime green) — used for glow, active states, primary buttons, key accents
- Secondary accent: `#ffb77d` / `#d97707` (amber/orange) — used for secondary headings, alternate card accents
- Text: `#e2e2e2` (on-surface), `#c5c8be` (on-surface-variant, secondary text)
- Borders: `#444841` (outline-variant), low-opacity white/tertiary borders on glass cards

**Typography:** Outfit for headings/body (as in the reference), Space Mono for code-style labels, eyebrows, tags, and terminal micro-copy.

**Signature effects carried over from the reference:**
- Glassmorphic cards (`backdrop-filter: blur`, translucent tinted background, thin border) for all content cards
- Parallax scroll on the hero background image (and optionally one other section)
- IntersectionObserver-driven scroll-reveal (fade + translate-up) on section entry
- Neon glow (box-shadow) on primary CTA buttons and active nav states
- Ambient flicker keyframe animation on small status/icon indicators
- Custom thin scrollbar styling
- Subtle mouse-parallax tilt on glass cards on desktop
- Terminal blink-cursor accent used sparingly (e.g. near a status line)

## Structure (top to bottom)

1. **Fixed header** — wordmark "Yosef Pilip" (left), plain-English nav: Experience / Projects / Education / Skills / Contact (center/right), small animated decorative status icons (far right, inline SVG).
2. **Hover-expand left icon rail** — collapsed icon-only sidebar that expands to show labels on hover, same mechanic as the reference, links mapped 1:1 to the same 5 sections. Collapses to icons-only on mobile/narrow viewports (or hides — see Responsive section).
3. **Hero** — one photographic background (licensed via Unsplash; moody night/nature or abstract tech-glow image), dark gradient/blur overlay for text legibility, terminal-style eyebrow tag (e.g. "SYSTEM_INITIALIZED"), existing headline + bio copy, CTA buttons (Get in touch / GitHub / LinkedIn) with neon glow on the primary button, scroll-down indicator.
4. **Experience** — eyebrow "SECTOR_01 // EXPERIENCE_LOG". Each of the 5 existing experience entries becomes a glass-blur card styled as a terminal log entry (labeled LOG_001, LOG_002, ... in the corner), keeping role/org/date/description/stack-tags from the current site. Scroll-reveal per card.
5. **Projects** — eyebrow "SECTOR_02 // PROJECT_ARCHIVE". Asymmetric bento grid: 1 large featured card (with the second licensed photo, grayscale-to-color image reveal on hover) + 3 smaller stacked cards, reusing existing project copy and tags.
6. **Education** — eyebrow "SECTOR_03 // EDUCATION_LOG". The 3 existing entries as terminal-style list rows inside a glass panel.
7. **Skills** — eyebrow "SECTOR_04 // SKILL_MATRIX". Existing 4 skill groups (Development, Platforms & APIs, Other, Languages) as chip groups restyled with the terminal tag aesthetic (small caps, monospace, subtle border).
8. **Contact** — eyebrow "SECTOR_05 // ESTABLISH_CONNECTION". Styled like the reference's terminal panel, but rendered as real `>`-prefixed clickable rows (Email / LinkedIn / GitHub, each a working link) rather than a fake submit form, since there's no backend to receive submissions.
9. **Footer** — small terminal-style copyright + status line.

## Imagery

Two licensed photos total (Unsplash License, hotlinked from `images.unsplash.com` with attribution in an HTML comment):
- Hero background: one full-bleed moody/atmospheric shot.
- Featured project card: one accent image.

Everything else uses CSS/SVG-generated visuals (gradients, glow, grain, subtle grid/circuit-line patterns) rather than additional photography, per the "half as many photos, but still visually rich" direction.

## Responsive behavior

- Left icon rail: hidden below a tablet breakpoint (e.g. `768px`) in favor of the top header nav, matching common patterns for this kind of hover-expand rail (it depends on hover, which doesn't exist on touch).
- Header nav collapses to a simple hamburger/menu toggle below the same breakpoint (not present in the reference, but required since the reference never addressed mobile nav).
- Projects bento grid collapses to a single column on narrow viewports.
- Parallax effects disabled or reduced on mobile (common practice — `background-attachment: fixed`-style parallax is unreliable on mobile browsers and can hurt scroll performance).

## Risks / open items to watch during implementation

- Need to pick and license-check 2 specific Unsplash photo URLs before implementation.
- `backdrop-filter` has partial support quirks on some older browsers — acceptable fallback is a solid semi-transparent background without blur.
- Mobile nav pattern isn't specified by the reference and will need original design during implementation.
