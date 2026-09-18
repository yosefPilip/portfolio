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

  it('builds the five hero layers', () => {
    // Both side-foliage plates are deliberately gone: plate--mid was black
    // palm silhouettes, plate--near the leafy fronds that replaced them, and
    // the owner rejected both. The far plate carries the framing itself.
    for (const layer of ['far', 'fog', 'name', 'shrub', 'low']) {
      expect(html).toContain(`plate--${layer}`);
    }
  });

  it('carries no banned copy', () => {
    expect(findForbiddenCopy(html)).toEqual([]);
  });

  it('labels every image frame so the placeholder says what belongs there', () => {
    // `frame` as a WORD in the class list, not the whole attribute: Plan 3's
    // Workshop frames are class="frame frame--before" and an exact match would
    // silently stop checking them rather than fail.
    const frames = html.match(/<figure[^>]*\bclass="[^"]*\bframe\b[^"]*"[^>]*>/g) ?? [];
    expect(frames.length).toBeGreaterThan(0);
    frames.forEach((frame) => expect(frame).toContain('data-label='));
  });

  it('keeps no side-foliage plate on the hero', () => {
    // Removed at the owner's request after two attempts at it — black
    // silhouettes, then lit fronds. Pinned so it does not quietly come back.
    const stack = readFileSync('src/styles/stack.css', 'utf8');
    expect(stack).not.toMatch(/\.hero \.plate--near/);
    expect(stack).not.toMatch(/\.hero \.plate--mid/);
    expect(html).not.toContain('plate--near');
  });
});
