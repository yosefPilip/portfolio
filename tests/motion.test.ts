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

    // The culler's tracked set isn't exposed, so assert it indirectly: bring
    // stackA and stackB on screen, take stackB back off screen, then drive
    // one rAF tick by hand (requestAnimationFrame is stubbed to record its
    // callback rather than invoke it) and check --p was written only for the
    // still-on-screen stack.
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
});
