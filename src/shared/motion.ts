import Lenis from 'lenis';
import { computeStackProgress } from '../lib/stackProgress';

/**
 * Starts the one rAF loop that drives every scroll-linked effect on the page:
 * Lenis smoothing, a --p custom property per in-view .stack, and one-shot
 * reveals. Safe to call on a page with no stacks.
 */
export function initMotion(): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stacks = Array.from(document.querySelectorAll<HTMLElement>('.stack'));

  if (reduceMotion) {
    // Pin every stack mid-travel and show everything. Nothing hidden, nothing moving.
    stacks.forEach((stack) => stack.style.setProperty('--p', '0.5'));
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
    return;
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

  function frame(time: number): void {
    lenis.raf(time);
    const viewportHeight = window.innerHeight;
    onScreen.forEach((stack) => {
      const rect = stack.getBoundingClientRect();
      const p = computeStackProgress(rect.top, rect.height, viewportHeight);
      stack.style.setProperty('--p', p.toFixed(4));
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

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
}
