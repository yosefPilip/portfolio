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
    // plate--mid is deliberately gone: it was a pair of black palm silhouettes
    // flanking the frame and the owner asked for the sides decluttered.
    // plate--shrub, the undergrowth the name sinks behind, took its place in
    // the count.
    for (const layer of ['far', 'fog', 'name', 'near', 'shrub', 'low']) {
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

  it('keeps the front plate above the wordmark but composited, not opaque', () => {
    // The front layer is meant to cross the name and show the forest through
    // the gaps. It does that by multiply, not by an alpha channel: a cutout
    // of fronds halos, and the previous one measured +24 RGB at the edges.
    const stack = readFileSync('src/styles/stack.css', 'utf8');
    expect(stack).toMatch(/\.hero \.plate--near \{[^}]*z-index:\s*4/);
    expect(stack).toMatch(/\.hero \.plate--near \{[^}]*--rate:\s*-350/);
    expect(stack).toMatch(/mix-blend-mode: multiply/);
  });
});
