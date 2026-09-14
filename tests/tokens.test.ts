import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { contrastRatio } from '../src/lib/contrast';

const css = readFileSync('src/styles/tokens.css', 'utf8');

/** Pull one custom property out of a given block. */
function token(block: string, name: string): string {
  const blockRe = new RegExp(`${block}\\s*\\{([^}]*)\\}`);
  const body = css.match(blockRe);
  if (!body) throw new Error(`No block ${block}`);
  const prop = body[1].match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
  if (!prop) throw new Error(`No --${name} in ${block}`);
  return prop[1].trim();
}

const ROOMS = ['home', 'projects', 'music', 'workshop'] as const;

describe('tokens.css', () => {
  it('defines all four rooms', () => {
    for (const room of ROOMS) {
      expect(css).toContain(`[data-room="${room}"]`);
    }
  });

  it('gives every room its own ground, surfaces and category colour', () => {
    for (const room of ROOMS) {
      const block = `\\[data-room="${room}"\\]`;
      for (const name of ['bg', 'bg-deep', 'surface', 'surface-tint', 'accent-2']) {
        expect(token(block, name)).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('never redefines the action colour per room — clay is learnable', () => {
    for (const room of ROOMS) {
      const block = css.match(new RegExp(`\\[data-room="${room}"\\]\\s*\\{([^}]*)\\}`))![1];
      expect(block).not.toContain('--accent:');
    }
  });

  it('gives every room four distinct category colours', () => {
    const seen = ROOMS.map((r) => token(`\\[data-room="${r}"\\]`, 'accent-2'));
    expect(new Set(seen).size).toBe(4);
  });

  it('meets the body-text contrast gate in every room', () => {
    for (const room of ROOMS) {
      const bg = token(`\\[data-room="${room}"\\]`, 'bg');
      expect(contrastRatio(token(':root', 'fg'), bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(token(':root', 'fg-dim'), bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(token(':root', 'muted'), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('meets the action and category gates in every room', () => {
    for (const room of ROOMS) {
      const bg = token(`\\[data-room="${room}"\\]`, 'bg');
      expect(contrastRatio(token(':root', 'accent'), bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(token(`\\[data-room="${room}"\\]`, 'accent-2'), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  // .pill.is-active is the one place --accent-2 is sanctioned as a FILL, and it
  // puts --bg-deep on top of it. Asserted for every room, not just projects, so
  // the music and workshop rooms inherit the gate instead of re-deriving it the
  // first time they grow a filter bar.
  it('keeps the active filter pill legible in every room', () => {
    for (const room of ROOMS) {
      const block = `\\[data-room="${room}"\\]`;
      expect(
        contrastRatio(token(block, 'bg-deep'), token(block, 'accent-2')),
        `--bg-deep on --accent-2 in ${room}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps dark text on a filled clay button above 5:1', () => {
    expect(contrastRatio(token(':root', 'on-accent'), token(':root', 'accent')))
      .toBeGreaterThanOrEqual(5);
  });

  // .btn--primary:hover swaps the fill to --accent-press while keeping --on-accent
  // text, so the pressed fill has to clear the same gate the resting fill does.
  it('keeps dark text on the PRESSED clay fill above 5:1', () => {
    expect(contrastRatio(token(':root', 'on-accent'), token(':root', 'accent-press')))
      .toBeGreaterThanOrEqual(5);
  });

  // .link:hover paints --accent-press as text straight on the room's ground.
  it('meets the body-text gate for the pressed action colour in every room', () => {
    for (const room of ROOMS) {
      const bg = token(`\\[data-room="${room}"\\]`, 'bg');
      expect(contrastRatio(token(':root', 'accent-press'), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  /**
   * Panels are the other ground text lands on: .panel uses --surface and
   * .panel--tint uses --surface-tint, and both carry 12px meta and links.
   *
   * --accent deliberately is NOT in this list. It is spec-fixed at #cf6b3e and
   * measures 4.00–4.29 on --surface-tint, which is exactly why clay-as-text on a
   * tinted panel is a mistake: the pressed token goes there instead.
   */
  it('meets the body-text gate on both panel surfaces in every room', () => {
    for (const room of ROOMS) {
      for (const ground of ['surface', 'surface-tint']) {
        const bg = token(`\\[data-room="${room}"\\]`, ground);
        for (const ink of ['fg', 'fg-dim', 'muted', 'accent-press']) {
          expect(
            contrastRatio(token(':root', ink), bg),
            `--${ink} on --${ground} in ${room}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});
