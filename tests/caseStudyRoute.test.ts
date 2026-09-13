import { describe, it, expect } from 'vitest';
import { slugFromPath, pathForSlug, isCaseStudyHref } from '../src/lib/caseStudyRoute';

describe('slugFromPath', () => {
  it('reads the slug of a known case study', () => {
    expect(slugFromPath('/projects/cache-it')).toBe('cache-it');
  });

  it('tolerates a trailing slash', () => {
    expect(slugFromPath('/projects/cache-it/')).toBe('cache-it');
  });

  it('tolerates the .html form', () => {
    expect(slugFromPath('/projects/cache-it.html')).toBe('cache-it');
  });

  it('returns null for the index itself', () => {
    expect(slugFromPath('/projects.html')).toBeNull();
    expect(slugFromPath('/projects')).toBeNull();
  });

  it('returns null for a project that has no case study', () => {
    expect(slugFromPath('/projects/podcast-generator')).toBeNull();
  });

  it('returns null for an unknown slug', () => {
    expect(slugFromPath('/projects/not-a-thing')).toBeNull();
  });
});

describe('pathForSlug', () => {
  it('builds the canonical clean URL', () => {
    expect(pathForSlug('cache-it')).toBe('/projects/cache-it');
  });
});

describe('isCaseStudyHref', () => {
  it('accepts a case study link', () => {
    expect(isCaseStudyHref('/projects/cache-it')).toBe(true);
  });

  it('rejects in-page anchors and external links', () => {
    expect(isCaseStudyHref('/projects.html#cloudgeometry')).toBe(false);
    expect(isCaseStudyHref('https://cache-it-one.vercel.app')).toBe(false);
  });
});
