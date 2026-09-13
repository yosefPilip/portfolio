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
