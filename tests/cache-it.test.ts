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
