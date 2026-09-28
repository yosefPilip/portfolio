import { nextRailScroll, railArrowState, railStep } from '../lib/photoRail';

/**
 * Arrow controls for a horizontal photo rail.
 *
 * Progressive enhancement, the same way round as the projects index: the
 * track is a plain scroll-snap container that already works with touch, a
 * trackpad, and the keyboard, so the arrows ship `hidden` in the HTML and are
 * revealed here only once they can actually do something.
 */
export function initPhotoRail(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.rail').forEach((rail) => {
    const track = rail.querySelector<HTMLElement>('[data-rail-track]');
    const arrows = rail.querySelector<HTMLElement>('.rail__arrows');
    const prev = rail.querySelector<HTMLButtonElement>('[data-rail-prev]');
    const next = rail.querySelector<HTMLButtonElement>('[data-rail-next]');
    if (!track || !arrows || !prev || !next) return;

    const maxScroll = (): number => track.scrollWidth - track.clientWidth;

    /* Nothing overflows, so there is nothing to page through and the arrows
       would be two dead buttons. Checked again on resize, because a narrowing
       window is exactly when the rail starts overflowing. */
    const sync = (): void => {
      const overflows = maxScroll() > 1;
      arrows.hidden = !overflows;
      if (!overflows) return;
      const state = railArrowState(track.scrollLeft, maxScroll());
      prev.disabled = state.prevDisabled;
      next.disabled = state.nextDisabled;
    };

    const page = (direction: 1 | -1): void => {
      const item = track.querySelector<HTMLElement>('.rail__item');
      if (!item) return;
      // The gap between two photos of one piece, not the track's own gap,
      // which is the wider space between pieces.
      const shots = item.parentElement ?? track;
      const gap = Number.parseFloat(getComputedStyle(shots).columnGap) || 0;
      const step = railStep(item.getBoundingClientRect().width, gap);
      track.scrollTo({
        left: nextRailScroll(track.scrollLeft, step, maxScroll(), direction),
        // The rail is not driven by Lenis — it is its own scroll container —
        // so a native smooth scroll here does not fight the page's rAF loop.
        behavior: 'smooth',
      });
    };

    prev.addEventListener('click', () => page(-1));
    next.addEventListener('click', () => page(1));
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);

    sync();
  });
}
