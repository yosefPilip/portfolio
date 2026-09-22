/**
 * Scroll maths for the workshop photo rail, kept pure so the arrow behaviour
 * can be tested without a DOM or a scroll animation.
 */

/** How far one arrow press moves the rail: a whole item, plus its gap. */
export function railStep(itemWidth: number, gap: number): number {
  return Math.max(1, Math.round(itemWidth + gap));
}

/**
 * Where an arrow press should land, clamped to the track's real range.
 *
 * Clamping here rather than leaving it to the browser is what lets the same
 * number drive the disabled state of the buttons: if the clamped target
 * equals where we already are, that direction has nowhere left to go.
 */
export function nextRailScroll(
  current: number,
  step: number,
  maxScroll: number,
  direction: 1 | -1,
): number {
  if (maxScroll <= 0) return 0;
  const target = current + step * direction;
  if (target < 0) return 0;
  if (target > maxScroll) return maxScroll;
  return target;
}

/**
 * Whether each arrow has anywhere to go.
 *
 * A one-pixel tolerance, because a track's scrollWidth and clientWidth are
 * fractional under a zoomed page or a fractional device pixel ratio, and an
 * exact comparison leaves the "next" arrow enabled forever at the far end.
 */
export function railArrowState(
  current: number,
  maxScroll: number,
): { prevDisabled: boolean; nextDisabled: boolean } {
  return {
    prevDisabled: current <= 1,
    nextDisabled: current >= maxScroll - 1,
  };
}
