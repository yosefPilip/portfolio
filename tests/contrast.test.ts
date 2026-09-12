import { describe, it, expect } from 'vitest';
import { hexToRgb, relativeLuminance, contrastRatio } from '../src/lib/contrast';

describe('hexToRgb', () => {
  it('parses six-digit hex', () => {
    expect(hexToRgb('#cf6b3e')).toEqual({ r: 207, g: 107, b: 62 });
  });

  it('expands three-digit shorthand', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('throws on anything that is not a colour', () => {
    expect(() => hexToRgb('var(--accent)')).toThrow();
  });
});

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('is 1:1 for a colour against itself', () => {
    expect(contrastRatio('#171b19', '#171b19')).toBeCloseTo(1, 5);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#cf6b3e', '#171b19')).toBeCloseTo(contrastRatio('#171b19', '#cf6b3e'), 5);
  });
});
