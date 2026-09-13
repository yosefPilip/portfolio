import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findForbiddenCopy } from '../src/lib/guards';

const html = readFileSync('index.html', 'utf8');

describe('Home hero', () => {
  it('declares the home room so the palette applies', () => {
    expect(html).toMatch(/<body[^>]*data-room="home"/);
  });

  it('has exactly one h1 — the wordmark is real, selectable text', () => {
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
  });

  it('separates the names with a plain space, not &nbsp;, or mobile never wraps', () => {
    const wordmark = html.match(/<h1[^>]*class="hero-wordmark"[^>]*>([\s\S]*?)<\/h1>/);
    expect(wordmark).not.toBeNull();
    expect(wordmark![1]).not.toContain('&nbsp;');
    expect(wordmark![1].trim()).toBe('Yosef Pilip');
  });

  it('builds the six hero layers', () => {
    for (const layer of ['canopy', 'fog', 'trees', 'name', 'trunks', 'low']) {
      expect(html).toContain(`plate--${layer}`);
    }
  });

  it('draws seven front trunks', () => {
    expect(html.match(/class="trunk trunk--\d"/g) ?? []).toHaveLength(7);
  });

  it('carries no banned copy', () => {
    expect(findForbiddenCopy(html)).toEqual([]);
  });

  it('labels every image frame so the placeholder says what belongs there', () => {
    const frames = html.match(/<figure class="frame"[^>]*>/g) ?? [];
    expect(frames.length).toBeGreaterThan(0);
    frames.forEach((frame) => expect(frame).toContain('data-label='));
  });

  it('gives the seven trunks at least five distinct crown heights, so the forest cannot flatten back into a barcode', () => {
    const stack = readFileSync('src/styles/stack.css', 'utf8');
    const tops = new Set<string>();
    for (let n = 1; n <= 7; n++) {
      const rule = stack.match(new RegExp(`\\.trunk--${n}\\s*\\{([^}]*)\\}`));
      expect(rule).not.toBeNull();
      const top = rule![1].match(/--top:\s*([^;]+);/);
      expect(top).not.toBeNull();
      tops.add(top![1].trim());
    }
    expect(tops.size).toBeGreaterThanOrEqual(5);
  });
});
