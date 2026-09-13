import { describe, it, expect } from 'vitest';
import { PROJECTS } from '../src/data/projects';

describe('PROJECTS', () => {
  it('holds the six projects in the order the spec fixes', () => {
    expect(PROJECTS.map((p) => p.slug)).toEqual([
      'cache-it',
      'podcast-generator',
      'resell-assistant',
      'cloudgeometry',
      'music-sorter',
      'portfolio',
    ]);
  });

  it('gives every project a title, hook, category, year and stack', () => {
    for (const p of PROJECTS) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.hook.length).toBeGreaterThan(0);
      expect(['ai', 'fullstack', 'tools']).toContain(p.category);
      expect(p.year.length).toBeGreaterThan(0);
      expect(p.stack.length).toBeGreaterThan(0);
    }
  });

  it('has unique slugs', () => {
    expect(new Set(PROJECTS.map((p) => p.slug)).size).toBe(PROJECTS.length);
  });

  it('ships exactly one case study at launch — Cache It', () => {
    const withStudies = PROJECTS.filter((p) => p.hasCaseStudy);
    expect(withStudies.map((p) => p.slug)).toEqual(['cache-it']);
  });

  it('never describes Cache It as image recognition', () => {
    const cacheIt = PROJECTS.find((p) => p.slug === 'cache-it')!;
    expect(cacheIt.hook.toLowerCase()).not.toContain('recognition');
    expect(cacheIt.stack.join(' ')).toContain('NFC');
  });
});
