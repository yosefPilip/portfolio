/**
 * The "Now" strip's typing machine, as a pure step function.
 *
 * All of the timing and sequencing lives here so it can be tested without a
 * DOM or a clock: `src/shared/nowTicker.ts` only owns the text node and the
 * setTimeout. The caller re-arms itself with the delay each step returns
 * rather than running on a fixed interval, because the three phases move at
 * three different speeds.
 */

/** Per-character typing delay. Slow enough to read as writing, not painting. */
export const TYPE_MS = 45;
/** How long a finished line sits before it starts erasing. The owner asked
    for "every 3-4 seconds"; with a ~1s type-in and a ~0.5s erase, a 3.5s hold
    puts a full line-to-line cycle right in that window. */
export const HOLD_MS = 3_500;
/** Per-character erase delay. Deliberately faster than typing — see the test. */
export const DELETE_MS = 22;

export type TickerPhase = 'typing' | 'holding' | 'deleting';

export interface TickerState {
  /** Index into the line list. */
  readonly index: number;
  /** How many characters of that line are currently shown. */
  readonly chars: number;
  readonly phase: TickerPhase;
}

export interface TickerStep {
  readonly state: TickerState;
  /** How long to wait before asking for the next step. */
  readonly delayMs: number;
}

/** The at-rest state: nothing typed yet, first line. */
export const INITIAL_STATE: TickerState = { index: 0, chars: 0, phase: 'typing' };

/**
 * Advance one step.
 *
 * @param state    where the strip is now
 * @param lengths  the character count of each line, in order
 */
export function nextTickerStep(state: TickerState, lengths: readonly number[]): TickerStep {
  // An empty list has no line to type. Hold the current state and check back
  // later rather than dividing by zero on the wrap.
  if (lengths.length === 0) return { state, delayMs: HOLD_MS };

  const index = state.index % lengths.length;
  const length = lengths[index] ?? 0;

  switch (state.phase) {
    case 'typing':
      // `>=`, not `===`: the line list is hand-edited data, so a line can get
      // shorter underneath a state that had already typed past its new end.
      if (state.chars >= length) {
        return { state: { index, chars: length, phase: 'holding' }, delayMs: HOLD_MS };
      }
      return { state: { index, chars: state.chars + 1, phase: 'typing' }, delayMs: TYPE_MS };

    case 'holding':
      return {
        state: { index, chars: Math.max(0, Math.min(state.chars, length) - 1), phase: 'deleting' },
        delayMs: DELETE_MS,
      };

    case 'deleting':
      if (state.chars <= 0) {
        return {
          state: { index: (index + 1) % lengths.length, chars: 0, phase: 'typing' },
          delayMs: TYPE_MS,
        };
      }
      return { state: { index, chars: state.chars - 1, phase: 'deleting' }, delayMs: DELETE_MS };
  }
}

/**
 * A shuffled copy of `lines`, for playing the list in a random order.
 *
 * A shuffled BAG rather than an independent random pick each time: picking
 * at random every cycle repeats lines back to back and can leave one unseen
 * for a long stretch, which reads as a bug rather than as variety. Drawing
 * from a shuffled order means every line shows once before any shows twice.
 *
 * @param rand   returns [0, 1) — injected so tests can drive it
 * @param avoid  a line that must not land first, so a reshuffle cannot
 *               replay the line the corner is already showing
 */
export function shuffleLines(
  lines: readonly string[],
  rand: () => number,
  avoid?: string,
): string[] {
  const out = lines.slice();
  // Fisher-Yates, back to front.
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // One deterministic rotation beats re-rolling: re-rolling can loop forever
  // when every entry is the same string.
  if (avoid !== undefined && out.length > 1 && out[0] === avoid) {
    [out[0], out[out.length - 1]] = [out[out.length - 1], out[0]];
  }
  return out;
}
