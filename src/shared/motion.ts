import Lenis from 'lenis';
// Lenis's own stylesheet. .lenis-stopped { overflow: clip } is what actually
// makes lenis.stop() hold the background still, so the scroll lock the mobile
// menu (and Plan 2's project overlay) depends on is not optional.
import 'lenis/dist/lenis.css';
import { computeStackProgress } from '../lib/stackProgress';

/**
 * The running motion layer, handed back so other modules can cooperate with it
 * instead of fighting it.
 *
 * `lenis` is null on the reduced-motion path, where no instance is ever
 * constructed — callers must handle that rather than assume smoothing exists.
 * `stop`/`start`/`scrollTo` are safe to call either way: they degrade to the
 * native behaviour when there is no instance.
 */
export interface MotionHandle {
  readonly lenis: Lenis | null;
  /** Freeze scrolling (menu open, modal open). No-op without Lenis. */
  stop(): void;
  /** Resume scrolling. No-op without Lenis. */
  start(): void;
  /** Smooth-scroll to an element, falling back to native scrollIntoView. */
  scrollTo(target: Element): void;
  /** Cancel the rAF loop, disconnect observers, destroy Lenis. */
  destroy(): void;
}

let current: MotionHandle | null = null;

/** The handle from the most recent initMotion(), or null before it has run. */
export function getMotion(): MotionHandle | null {
  return current;
}

/** Scroll `target` into view through Lenis when it exists, natively otherwise. */
function nativeScrollTo(target: Element): void {
  target.scrollIntoView({ behavior: 'smooth' });
}

/** The one place --p is written. Called from the rAF loop and once at init. */
function writeProgress(stack: HTMLElement, viewportHeight: number): void {
  const rect = stack.getBoundingClientRect();
  const p = computeStackProgress(rect.top, rect.height, viewportHeight);
  stack.style.setProperty('--p', p.toFixed(4));
}

/**
 * Starts the one rAF loop that drives every scroll-linked effect on the page:
 * Lenis smoothing, a --p custom property per in-view .stack, and one-shot
 * reveals. Safe to call on a page with no stacks.
 */
export function initMotion(): MotionHandle {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stacks = Array.from(document.querySelectorAll<HTMLElement>('.stack'));

  /* A stack's position is JS-derived, and this module cannot run before the
     first paint — it is a module script behind a network fetch. So a load that
     starts anywhere but the top painted every plate at `--p: 0`, its at-rest
     pose, and then snapped it to the real progress on the first rAF: measured
     on /projects.html at scrollY 960, the ridge jumped 570px, 165ms in. That
     is the hero "twitching" on every reload.

     Restoration is what creates the mismatch, so restoration is what goes. The
     page now always loads at the top, where `--p: 0` is not a guess but the
     correct answer, and the first paint is right without waiting for JS.

     Scoped deliberately: this only turns off the browser's SCROLL restore. It
     is not a scrollTo, so a `#hash` in the URL still lands on its target, and
     same-document history (the case-study overlay's Back) keeps the position
     it already has rather than being re-restored under an open overlay. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  if (reduceMotion) {
    // Pin every stack mid-travel and show everything. Nothing hidden, nothing moving.
    stacks.forEach((stack) => stack.style.setProperty('--p', '0.5'));
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));

    // Still a handle, so callers never branch on "did motion initialise".
    current = {
      lenis: null,
      stop() {},
      start() {},
      scrollTo(target) {
        // Honour the preference: jump, do not animate.
        target.scrollIntoView();
      },
      destroy() {
        current = null;
      },
    };
    return current;
  }

  // Only stacks currently on screen get measured each frame.
  const onScreen = new Set<HTMLElement>();
  const culler = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) onScreen.add(el);
        else onScreen.delete(el);
      });
    },
    { rootMargin: '10% 0px' },
  );
  stacks.forEach((stack) => culler.observe(stack));

  const lenis = new Lenis({ duration: 1.05, smoothWheel: true });

  // Held so the loop can actually be cancelled; without it destroy() would
  // leave a frame callback running against a torn-down Lenis.
  let rafId = 0;

  function frame(time: number): void {
    lenis.raf(time);
    const viewportHeight = window.innerHeight;
    onScreen.forEach((stack) => writeProgress(stack, viewportHeight));
    rafId = requestAnimationFrame(frame);
  }

  /* Synchronously, before the first rAF and before the culler's first
     callback: every stack gets its true --p now. Manual restoration above
     means this is almost always writing 0 over 0, but the two guards are
     independent on purpose — a `#hash` load, or a browser that ignores
     scrollRestoration, still lands here with the page scrolled, and this is
     what keeps that paint correct. Cheap: one layout read per stack, once. */
  stacks.forEach((stack) => writeProgress(stack, window.innerHeight));

  rafId = requestAnimationFrame(frame);

  // One-shot reveals: each element unobserves itself so scrolling back never replays it.
  const revealer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
  );
  document.querySelectorAll('.reveal').forEach((el) => revealer.observe(el));

  current = {
    lenis,
    stop() {
      lenis.stop();
    },
    start() {
      lenis.start();
    },
    scrollTo(target) {
      lenis.scrollTo(target as HTMLElement);
    },
    destroy() {
      cancelAnimationFrame(rafId);
      culler.disconnect();
      revealer.disconnect();
      lenis.destroy();
      current = null;
    },
  };
  return current;
}

export { nativeScrollTo };
