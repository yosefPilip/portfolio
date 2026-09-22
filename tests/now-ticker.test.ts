import { describe, it, expect } from 'vitest';
import {
  nextTickerStep,
  shuffleLines,
  TYPE_MS,
  HOLD_MS,
  DELETE_MS,
  type TickerState,
} from '../src/lib/nowTicker';

/** Drive the machine n steps and collect what the strip would show each time. */
function run(lengths: number[], steps: number, from?: TickerState): string[] {
  let state: TickerState = from ?? { index: 0, chars: 0, phase: 'typing' };
  const seen: string[] = [];
  for (let i = 0; i < steps; i += 1) {
    state = nextTickerStep(state, lengths).state;
    seen.push(`${state.index}:${state.chars}:${state.phase}`);
  }
  return seen;
}

describe('now ticker state machine', () => {
  it('types one character at a time', () => {
    const step = nextTickerStep({ index: 0, chars: 3, phase: 'typing' }, [10]);
    expect(step.state).toEqual({ index: 0, chars: 4, phase: 'typing' });
    expect(step.delayMs).toBe(TYPE_MS);
  });

  it('holds the finished line instead of typing past its end', () => {
    const step = nextTickerStep({ index: 0, chars: 10, phase: 'typing' }, [10]);
    expect(step.state.phase).toBe('holding');
    expect(step.state.chars).toBe(10);
    // The hold is the whole point of the strip: a line has to be readable.
    expect(step.delayMs).toBe(HOLD_MS);
  });

  it('starts deleting after the hold', () => {
    const step = nextTickerStep({ index: 0, chars: 10, phase: 'holding' }, [10]);
    expect(step.state).toEqual({ index: 0, chars: 9, phase: 'deleting' });
    expect(step.delayMs).toBe(DELETE_MS);
  });

  it('deletes faster than it types', () => {
    expect(DELETE_MS).toBeLessThan(TYPE_MS);
  });

  it('advances to the next line only once the last character is gone', () => {
    const mid = nextTickerStep({ index: 0, chars: 1, phase: 'deleting' }, [10, 4]);
    expect(mid.state).toEqual({ index: 0, chars: 0, phase: 'deleting' });

    const turn = nextTickerStep({ index: 0, chars: 0, phase: 'deleting' }, [10, 4]);
    expect(turn.state).toEqual({ index: 1, chars: 0, phase: 'typing' });
  });

  it('wraps from the last line back to the first', () => {
    const step = nextTickerStep({ index: 2, chars: 0, phase: 'deleting' }, [5, 5, 5]);
    expect(step.state.index).toBe(0);
  });

  it('wraps a single line back onto itself rather than stalling', () => {
    const step = nextTickerStep({ index: 0, chars: 0, phase: 'deleting' }, [5]);
    expect(step.state).toEqual({ index: 0, chars: 0, phase: 'typing' });
  });

  it('completes a full cycle of a two-line list', () => {
    // 'ab' then 'c': type a, type b, hold, delete b, delete a, turn, type c…
    const seen = run([2, 1], 7);
    expect(seen).toEqual([
      '0:1:typing',
      '0:2:typing',
      '0:2:holding',
      '0:1:deleting',
      '0:0:deleting',
      '1:0:typing',
      '1:1:typing',
    ]);
  });

  it('survives an empty line without spinning on it', () => {
    // A zero-length entry has nothing to type, so it must fall straight
    // through to the hold rather than sit in `typing` forever.
    const step = nextTickerStep({ index: 0, chars: 0, phase: 'typing' }, [0, 3]);
    expect(step.state.phase).toBe('holding');
  });

  it('returns the line unchanged when there is nothing to show', () => {
    // Defensive: an empty list must not produce index NaN or a modulo by zero.
    const step = nextTickerStep({ index: 0, chars: 0, phase: 'typing' }, []);
    expect(step.state).toEqual({ index: 0, chars: 0, phase: 'typing' });
    expect(Number.isFinite(step.delayMs)).toBe(true);
  });

  it('recovers when a line shrinks under a state that outran it', () => {
    // The list is editable data. If chars exceeds the current line's length,
    // the machine must clamp instead of typing into nothing.
    const step = nextTickerStep({ index: 0, chars: 99, phase: 'typing' }, [4]);
    expect(step.state.phase).toBe('holding');
    expect(step.state.chars).toBe(4);
  });
});

describe('shuffled play order', () => {
  /** A rand() that walks a fixed script, so a shuffle is fully determined. */
  const scripted = (values: number[]): (() => number) => {
    let i = 0;
    return () => values[i++ % values.length];
  };

  it('keeps every line exactly once', () => {
    const lines = ['a', 'b', 'c', 'd', 'e'];
    const out = shuffleLines(lines, scripted([0.1, 0.9, 0.4, 0.7]));
    expect(out.slice().sort()).toEqual(lines.slice().sort());
    expect(out).toHaveLength(lines.length);
  });

  it('does not mutate the list it was given', () => {
    const lines = ['a', 'b', 'c'];
    shuffleLines(lines, scripted([0.5, 0.2]));
    expect(lines).toEqual(['a', 'b', 'c']);
  });

  it('never starts on the line that is already showing', () => {
    // The reshuffle happens the instant the bag empties, so without this the
    // corner can erase a line and type the very same one straight back.
    const lines = ['a', 'b', 'c', 'd'];
    for (let seed = 0; seed < 40; seed += 1) {
      const rand = scripted([seed / 40, (seed * 7) % 40 / 40, (seed * 3) % 40 / 40]);
      const out = shuffleLines(lines, rand, 'c');
      expect(out[0]).not.toBe('c');
    }
  });

  it('terminates even when every line is identical', () => {
    // The avoid-rotation is a single swap rather than a re-roll for exactly
    // this case; a re-roll loop would never exit here.
    const out = shuffleLines(['same', 'same'], scripted([0.5]), 'same');
    expect(out).toEqual(['same', 'same']);
  });

  it('handles a one-line and an empty list without throwing', () => {
    expect(shuffleLines(['only'], scripted([0.5]), 'only')).toEqual(['only']);
    expect(shuffleLines([], scripted([0.5]))).toEqual([]);
  });
});
