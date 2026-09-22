import { NOW_LINES } from '../data/now';
import { INITIAL_STATE, nextTickerStep, shuffleLines, type TickerState } from '../lib/nowTicker';

/**
 * Types the "Now" corner in the bottom-right of the hero, one line at a
 * time, forever.
 *
 * The machine itself is in `src/lib/nowTicker.ts`; this module owns only the
 * text node, the timer and the announcement. Nothing here animates in CSS —
 * the only moving part is textContent — so the transform/opacity-only rule
 * applies just to the caret, which blinks on opacity.
 *
 * Progressive enhancement, the same way round as the projects index: the HTML
 * ships line one as real text, and this takes over only if it can do better.
 */
export function initNowTicker(): (() => void) | null {
  const text = document.querySelector<HTMLElement>('[data-now]');
  if (!text) return null;

  const lines = NOW_LINES.filter((line) => line.trim().length > 0);
  // One line is not a ticker, it is a sentence. Leave the static HTML alone.
  if (lines.length < 2) return null;

  const strip = text.closest<HTMLElement>('.hero-now') ?? text;

  // Honour the preference: the line that shipped in the HTML stays put.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    strip.classList.add('is-static');
    return null;
  }

  /* The typed span mutates a character at a time, which is noise to a screen
     reader. Hide it and announce whole sentences from a live region instead.
     Both happen HERE, not in the HTML: without JS the span is the only copy of
     the text, and hiding it in the markup would hide it from assistive tech on
     exactly the path that has no replacement. */
  text.setAttribute('aria-hidden', 'true');
  const live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  strip.append(live);

  strip.classList.add('is-typing');

  /* Played in a shuffled order, reshuffled each time the list is exhausted,
     so the corner does not recite the same sequence on every visit. The
     machine itself stays sequential — it walks `order`, and `order` is what
     changes. */
  let order = shuffleLines(lines, Math.random);
  let lengths = order.map((line) => line.length);
  let state: TickerState = INITIAL_STATE;
  let timer = 0;
  // What the live region last said, so a re-announcement of the same line
  // (the hold step fires once per line) never double-speaks.
  let announced = '';

  /* An arrow bound to a const, not a `function` declaration: TypeScript
     preserves the `if (!text) return` narrowing inside a closure only when the
     closure is created after it, and a hoisted declaration is not. */
  const step = (): void => {
    const previous = state.index;
    const next = nextTickerStep(state, lengths);
    state = next.state;

    // Wrapped back to the start, so the bag is empty: refill it. Done here,
    // at chars 0 with nothing yet typed, which is the one moment the lengths
    // array can be swapped without stranding the machine mid-line.
    if (state.index === 0 && previous !== 0) {
      order = shuffleLines(lines, Math.random, order[previous]);
      lengths = order.map((l) => l.length);
    }

    const line = order[state.index] ?? '';
    text.textContent = line.slice(0, state.chars);

    if (state.phase === 'holding' && announced !== line) {
      announced = line;
      live.textContent = line;
    }

    timer = window.setTimeout(step, next.delayMs);
  };

  // Start from empty so the first line types in rather than appearing whole.
  text.textContent = '';
  timer = window.setTimeout(step, 400);

  return () => {
    window.clearTimeout(timer);
    strip.classList.remove('is-typing');
    text.removeAttribute('aria-hidden');
    live.remove();
    // Leave a readable line behind rather than an empty strip.
    text.textContent = order[state.index] ?? order[0];
  };
}
