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

  it('keeps dark text on a filled clay button above 5:1', () => {
    expect(contrastRatio(token(':root', 'on-accent'), token(':root', 'accent')))
      .toBeGreaterThanOrEqual(5);
  });
});
