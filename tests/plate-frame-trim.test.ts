import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

/**
 * The visual editing panel offers a band-trim control (height + anchor) on
 * any full-bleed plate frame — see overlay.ts's buildFrameRow. On an inline
 * content frame that control is genuinely useful. On a `.plate > .frame` it
 * is a loaded gun: `height: 53%; top: 47%` turns the plate's painted surface
 * into a floating strip whose hard edges sweep through the viewport as the
 * plate parallaxes, leaving bare backdrop below it. That is the "big gap
 * under it" the owner reported on the Projects hero four separate times —
 * and because the trim is stored per slot and deliberately survives an
 * ordinary drag or zoom, it came back every time a new image was dropped
 * into the slot.
 *
 * Two defences now exist and this file guards the outer one:
 *
 *   1. imageEditing.ts clears the trim when a NEW image is dropped, so a
 *      re-drop can no longer inherit the previous subject's band.
 *   2. This test fails the suite if a trim is ever committed for a plate
 *      frame regardless of how it got there.
 *
 * `#ridge .plate--front` additionally out-specifies the panel's output in
 * stack.css, but that protects one slot; this protects all of them.
 */

const PAGES = ['index.html', 'projects.html', 'music.html', 'workshop.html', 'projects/cache-it.html'];
const GENERATED = 'src/styles/layout.generated.css';

/** Every data-label whose frame is a DIRECT child of a .plate — the frames
    whose box is the plate's box, and which therefore must not be trimmed. */
function plateFrameLabels(): { label: string; page: string }[] {
  const out: { label: string; page: string }[] = [];
  for (const page of PAGES) {
    const { document } = new JSDOM(readFileSync(page, 'utf8')).window;
    for (const frame of document.querySelectorAll('.plate > .frame[data-label]')) {
      const label = frame.getAttribute('data-label');
      if (label) out.push({ label, page });
    }
  }
  return out;
}

/** The declarations layout.generated.css applies to the FRAME itself for a
    label — never the `... img` rule, which is image content, not the box. */
function frameBoxDecls(css: string, label: string): string {
  // Escape for a literal match inside the attribute selector, then find the
  // rule that targets the frame with no trailing ` img`.
  const attr = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = new RegExp(`\\.frame\\[data-label="${attr}"\\]\\s*\\{([^}]*)\\}`, 'g');
  let body = '';
  for (const m of css.matchAll(rule)) body += m[1];
  return body;
}

describe('panel frame trim never reaches a full-bleed plate', () => {
  const css = readFileSync(GENERATED, 'utf8');
  const labels = plateFrameLabels();

  it('finds the plate frames it is meant to protect', () => {
    // If the markup is restructured so no frame is a direct child of a plate,
    // every assertion below would pass vacuously. Fail loudly instead.
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.map((l) => l.label)).toContain('Projects L3 — ridge-near');
  });

  it.each(labels)('$page: "$label" carries no height/top trim', ({ label }) => {
    const body = frameBoxDecls(css, label);
    // `background: transparent` on a cutout slot is fine — it is a paint
    // choice, not a box choice. height/top are what break the parallax.
    expect(body).not.toMatch(/(^|[;{\s])height\s*:/);
    expect(body).not.toMatch(/(^|[;{\s])top\s*:/);
  });
});
