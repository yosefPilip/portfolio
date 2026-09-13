export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n <= 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Scroll progress of one sticky stack, 0 → 1.
 *
 * 0 is the moment the stack's top reaches the viewport top; 1 is the moment
 * its bottom reaches the viewport bottom. A stack no taller than the viewport
 * has no travel and stays at 0.
 *
 * @param rectTop        getBoundingClientRect().top of the .stack element
 * @param rectHeight     its full height, including the scroll runway
 * @param viewportHeight window.innerHeight
 */
export function computeStackProgress(
  rectTop: number,
  rectHeight: number,
  viewportHeight: number,
): number {
  const travel = rectHeight - viewportHeight;
  if (travel <= 0) return 0;
  return clamp01(-rectTop / travel);
}
