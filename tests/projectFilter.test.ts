import { describe, it, expect } from 'vitest';
import { filterProjects, countByCategory } from '../src/lib/projectFilter';
import { PROJECTS } from '../src/data/projects';

describe('filterProjects', () => {
  it('returns everything for "all"', () => {
    expect(filterProjects(PROJECTS, 'all')).toHaveLength(PROJECTS.length);
  });

  it('returns only the matching category', () => {
    const ai = filterProjects(PROJECTS, 'ai');
    expect(ai.length).toBeGreaterThan(0);
    expect(ai.every((p) => p.category === 'ai')).toBe(true);
  });

  it('preserves the fixed order', () => {
    const all = filterProjects(PROJECTS, 'all');
    expect(all.map((p) => p.slug)).toEqual(PROJECTS.map((p) => p.slug));
  });

  it('returns an empty array for a category nothing matches', () => {
    expect(filterProjects([], 'ai')).toEqual([]);
  });
});

describe('countByCategory', () => {
  it('counts all and each category', () => {
    const counts = countByCategory(PROJECTS);
    expect(counts.all).toBe(PROJECTS.length);
    expect(counts.ai + counts.fullstack + counts.tools).toBe(PROJECTS.length);
  });
});
