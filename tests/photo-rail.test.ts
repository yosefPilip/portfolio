import { describe, it, expect } from 'vitest';
import { nextRailScroll, railArrowState, railStep } from '../src/lib/photoRail';

describe('photo rail scrolling', () => {
  it('pages by a whole item plus its gap', () => {
    expect(railStep(200, 14)).toBe(214);
  });

  it('never returns a step of zero, which would freeze the arrows', () => {
    // An item measured before layout settles can come back at 0 width.
    expect(railStep(0, 0)).toBeGreaterThan(0);
  });

  it('moves forward and back by one page', () => {
    expect(nextRailScroll(0, 214, 1000, 1)).toBe(214);
    expect(nextRailScroll(428, 214, 1000, -1)).toBe(214);
  });

  it('stops at both ends instead of overshooting', () => {
    expect(nextRailScroll(900, 214, 1000, 1)).toBe(1000);
    expect(nextRailScroll(100, 214, 1000, -1)).toBe(0);
  });

  it('returns 0 when there is nothing to scroll', () => {
    // A rail whose photos all fit: the arrows are hidden, but the maths must
    // not hand back a negative or a NaN if it is asked anyway.
    expect(nextRailScroll(0, 214, 0, 1)).toBe(0);
    expect(nextRailScroll(0, 214, -5, -1)).toBe(0);
  });

  it('disables the arrow that has nowhere to go', () => {
    expect(railArrowState(0, 1000)).toEqual({ prevDisabled: true, nextDisabled: false });
    expect(railArrowState(1000, 1000)).toEqual({ prevDisabled: false, nextDisabled: true });
    expect(railArrowState(500, 1000)).toEqual({ prevDisabled: false, nextDisabled: false });
  });

  it('tolerates a fractional end position', () => {
    // scrollWidth/clientWidth are fractional under zoom or a fractional DPR,
    // so an exact comparison leaves "next" enabled forever at the far end.
    expect(railArrowState(999.4, 1000).nextDisabled).toBe(true);
    expect(railArrowState(0.6, 1000).prevDisabled).toBe(true);
  });
});
