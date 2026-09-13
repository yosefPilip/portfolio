import { describe, it, expect } from 'vitest';
import { computeStackProgress, clamp01 } from '../src/lib/stackProgress';

const VH = 800;
const TALL = 2400; // a 300vh stack; travel = 1600

describe('clamp01', () => {
  it('clamps below and above', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(9)).toBe(1);
  });

  it('treats NaN as 0 rather than propagating it into a transform', () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('computeStackProgress', () => {
  it('is 0 while the stack is still below the viewport', () => {
    expect(computeStackProgress(1200, TALL, VH)).toBe(0);
  });

  it('is 0 exactly when the stack top meets the viewport top', () => {
    expect(computeStackProgress(0, TALL, VH)).toBe(0);
  });

  it('is 0.5 at the halfway point of its travel', () => {
    expect(computeStackProgress(-800, TALL, VH)).toBeCloseTo(0.5, 5);
  });

  it('is 1 when the stack bottom meets the viewport bottom', () => {
    expect(computeStackProgress(-1600, TALL, VH)).toBe(1);
  });

  it('stays 1 after the stack has scrolled past', () => {
    expect(computeStackProgress(-5000, TALL, VH)).toBe(1);
  });

  it('is 0 for a stack no taller than the viewport — there is no travel', () => {
    expect(computeStackProgress(-10, VH, VH)).toBe(0);
    expect(computeStackProgress(-10, 400, VH)).toBe(0);
  });
});
