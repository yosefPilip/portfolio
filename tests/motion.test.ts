import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Lenis must never actually run in tests: it schedules its own internal
// timers/rAF work that has nothing to do with what this file verifies.
vi.mock('lenis', () => ({
  default: vi.fn().mockImplementation(function LenisMock() {
    return { raf: vi.fn(), stop: vi.fn(), start: vi.fn(), scrollTo: vi.fn(), destroy: vi.fn() };
  }),
}));

import Lenis from 'lenis';
import { initMotion } from '../src/shared/motion';

type MockEntry = { isIntersecting: boolean; target: Element };
type IOCallback = (entries: MockEntry[]) => void;

/**
 * A minimal IntersectionObserver stand-in that lets a test fire entries by
 * hand instead of relying on jsdom's (nonexistent) real intersection
 * observation, and that records which elements were observed so a test can
 * tell the culler instance apart from the revealer instance.
 */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  observed = new Set<Element>();
  observe = vi.fn((el: Element) => {
    this.observed.add(el);
  });
  unobserve = vi.fn((el: Element) => {
    this.observed.delete(el);
  });
  disconnect = vi.fn();
  private callback: IOCallback;

  constructor(callback: IOCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  trigger(entries: MockEntry[]): void {
    this.callback(entries);
  }
}

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      media: '',
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  MockIntersectionObserver.instances.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('initMotion — prefers-reduced-motion', () => {
  it('pins every .stack to --p: 0.5, reveals every .reveal, and constructs neither Lenis nor an IntersectionObserver', () => {
    stubMatchMedia(true);
    const ioSpy = vi.fn();
    vi.stubGlobal('IntersectionObserver', ioSpy);
    vi.stubGlobal('requestAnimationFrame', vi.fn());

    document.body.innerHTML = `
      <div class="stack" id="s1"></div>
      <div class="stack" id="s2"></div>
      <div class="reveal" id="r1"></div>
      <div class="reveal" id="r2"></div>
    `;

    initMotion();

    document.querySelectorAll<HTMLElement>('.stack').forEach((el) => {
      expect(el.style.getPropertyValue('--p')).toBe('0.5');
    });
    document.querySelectorAll('.reveal').forEach((el) => {
      expect(el.classList.contains('is-visible')).toBe(true);
    });
    expect(Lenis).not.toHaveBeenCalled();
    expect(ioSpy).not.toHaveBeenCalled();
  });
});

describe('initMotion — normal path', () => {
  it('reveals an intersecting .reveal exactly once (and unobserves it), ignores a non-intersecting one, and the culler tracks only in-view .stack elements', () => {
    stubMatchMedia(false);
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver);

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      }),
    );

    document.body.innerHTML = `
      <div class="stack" id="stackA"></div>
      <div class="stack" id="stackB"></div>
      <div class="reveal" id="revealA"></div>
      <div class="reveal" id="revealB"></div>
    `;
    const stackA = document.getElementById('stackA') as HTMLElement;
    const stackB = document.getElementById('stackB') as HTMLElement;
    const revealA = document.getElementById('revealA') as HTMLElement;
    const revealB = document.getElementById('revealB') as HTMLElement;

    initMotion();

    // Two IntersectionObservers get constructed: the culler (over .stack) and
    // the revealer (over .reveal). Tell them apart by what they observed.
    expect(MockIntersectionObserver.instances).toHaveLength(2);
    const culler = MockIntersectionObserver.instances.find((o) => o.observed.has(stackA));
    const revealer = MockIntersectionObserver.instances.find((o) => o.observed.has(revealA));
    expect(culler).toBeDefined();
    expect(revealer).toBeDefined();

    // One-shot reveal: an intersecting entry adds the class and unobserves itself.
    revealer!.trigger([{ isIntersecting: true, target: revealA }]);
    expect(revealA.classList.contains('is-visible')).toBe(true);
    expect(revealer!.unobserve).toHaveBeenCalledWith(revealA);

    // A non-intersecting entry does nothing.
    revealer!.trigger([{ isIntersecting: false, target: revealB }]);
    expect(revealB.classList.contains('is-visible')).toBe(false);

    // Every stack is SEEDED at init, on screen or not. requestAnimationFrame
    // is stubbed to record its callback rather than run it and no callback has
    // been invoked yet, so a value here proves the write was synchronous —
    // which is the point of it: a load at a restored scroll position (or on a
    // #hash) has to paint in the right place, not snap to it a frame later.
    expect(stackA.style.getPropertyValue('--p')).toBe('0.0000');
    expect(stackB.style.getPropertyValue('--p')).toBe('0.0000');

    // Cleared so the assertion below is about the rAF loop alone.
    stackA.style.removeProperty('--p');
    stackB.style.removeProperty('--p');

    // The culler's tracked set isn't exposed, so assert it indirectly: bring
    // stackA and stackB on screen, take stackB back off screen, then drive
    // one rAF tick by hand and check --p was written only for the
    // still-on-screen stack. The seed is a one-off; per-frame work stays culled.
    culler!.trigger([
      { isIntersecting: true, target: stackA },
      { isIntersecting: true, target: stackB },
    ]);
    culler!.trigger([{ isIntersecting: false, target: stackB }]);

    expect(rafCallbacks.length).toBeGreaterThan(0);
    rafCallbacks[0](0);

    expect(stackA.style.getPropertyValue('--p')).toBe('0.0000');
    expect(stackB.style.getPropertyValue('--p')).toBe('');
  });

  /**
   * The other half of the same fix. A stack's position is JS-derived and this
   * module cannot run before the first paint, so a load that starts scrolled
   * painted every plate at `--p: 0` and then snapped: 570px on the ridge hero,
   * 165ms in. Turning the browser's scroll restore off means a reload starts
   * where `--p: 0` is the correct answer, so the first paint is already right.
   */
  it('turns off the browser scroll restore, so a reload cannot paint a stack at the wrong progress', () => {
    stubMatchMedia(false);
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver);
    vi.stubGlobal('requestAnimationFrame', vi.fn());

    history.scrollRestoration = 'auto';
    initMotion();
    expect(history.scrollRestoration).toBe('manual');
  });
});
