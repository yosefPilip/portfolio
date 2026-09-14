import { isCaseStudyHref, slugFromPath, pathForSlug } from '../lib/caseStudyRoute';
import { getMotion } from './motion';

/** Regions hidden from AT and taken out of the tab order while the overlay is open. */
const BACKGROUND = 'header, main, footer';

/**
 * Tier 3. A case-study link opens an animated overlay without a reload AND
 * pushes /projects/<slug> into the address bar. The same URL cold-loads as a
 * real page, so it stays shareable and indexable. Back closes the overlay.
 */
export function initCaseStudyRouting(root: Document): void {
  const overlay = root.getElementById('csOverlay');
  if (!overlay) return;

  // Captured once, at init, rather than hardcoded: `vite dev` does not
  // implement Vercel's cleanUrls, so the real URL this page is running at
  // may be `/projects.html` in dev and `/projects` in production. Restoring
  // whatever it actually was — hash included, so an arrival fragment like
  // `/projects.html#cloudgeometry` survives a round trip through the
  // overlay — is correct in both, and it is the only place in this module
  // that would otherwise need a hardcoded path.
  const indexPath = window.location.pathname + window.location.hash;

  let lastFocused: HTMLElement | null = null;

  function close(push: boolean): void {
    overlay!.hidden = true;
    overlay!.innerHTML = '';
    root.body.classList.remove('is-overlay-open');
    getMotion()?.start();

    // Un-inert BEFORE focusing, or the focus call lands on an inert element.
    root.querySelectorAll(BACKGROUND).forEach((el) => el.removeAttribute('inert'));
    if (push) history.pushState({ cs: null }, '', indexPath);
    lastFocused?.focus();
    lastFocused = null;
  }

  async function open(slug: string, push: boolean): Promise<void> {
    const path = pathForSlug(slug);

    // A popstate-driven open has no anchor to return focus to; a stale one
    // left over from a previous click would otherwise get focused on close.
    if (!push) lastFocused = null;

    // Snapshot the address the visitor was actually at when this open was
    // requested. If it no longer matches once the fetch resolves, something
    // else moved them on (a Back/Forward while this was in flight, or a
    // second click) — showing or pushing now would override that navigation
    // a moment after it happened, which is worse than doing nothing.
    const startPath = window.location.pathname;

    try {
      const response = await fetch(`${path}.html`);
      if (window.location.pathname !== startPath) return;
      if (!response.ok) throw new Error(String(response.status));
      const markup = await response.text();
      const parsed = new DOMParser().parseFromString(markup, 'text/html');
      const main = parsed.querySelector('main');
      if (!main) throw new Error('no main');

      // The check above only covers the fetch await. `response.text()` is a
      // second await, and a Back/Forward or a second click landing during the
      // body read would otherwise race straight through it. This is the
      // authoritative checkpoint: it sits before the first line that mutates
      // the overlay, so a stale open can neither show itself nor stomp the
      // content a newer open has already put there.
      if (window.location.pathname !== startPath) return;

      overlay!.innerHTML = '';
      const closeButton = root.createElement('button');
      closeButton.className = 'cs-close';
      closeButton.setAttribute('aria-label', 'Close case study');
      closeButton.textContent = '✕';
      closeButton.addEventListener('click', () => close(true));
      overlay!.append(closeButton, main);

      overlay!.hidden = false;
      root.body.classList.add('is-overlay-open');
      getMotion()?.stop();

      // The page's own header/main/footer sit behind a z-index: 100 overlay
      // and the fetched page brings its own <main> — without this, a
      // keyboard user tabs straight into hidden background content, and the
      // document briefly carries two <main> landmarks at once.
      //
      // BACKGROUND is document-wide ('header, main, footer'), and the overlay
      // now contains its own <main> (and that <main> may carry its own
      // <header>). A containment check keeps the sweep scoped to what is
      // actually behind the overlay, rather than relying on statement order
      // between this loop and the append() above it — order would work today
      // but silently rot the moment either line moves.
      root.querySelectorAll(BACKGROUND).forEach((el) => {
        if (!overlay!.contains(el)) el.setAttribute('inert', '');
      });

      if (push) history.pushState({ cs: slug }, '', path);
      closeButton.focus();
    } catch (err) {
      // Anything unexpected: fall back to a plain navigation rather than
      // leaving the visitor on a page whose link appeared to do nothing.
      console.warn('Case study overlay failed to open; falling back to navigation.', err);
      window.location.assign(path);
    }
  }

  root.addEventListener('click', (event) => {
    const mouse = event as MouseEvent;
    if (
      mouse.defaultPrevented ||
      mouse.button !== 0 ||
      mouse.metaKey ||
      mouse.ctrlKey ||
      mouse.shiftKey ||
      mouse.altKey
    )
      return;
    const anchor = (event.target as HTMLElement | null)?.closest?.('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href) return;
    // Stripped once and reused for both checks: isCaseStudyHref validates
    // the stripped form internally, but slugFromPath needs that same
    // stripped form too, or a link like `/projects/cache-it#intro` passes
    // the first check and then fails the second, falling through to a full
    // page navigation instead of being intercepted.
    const clean = href.split('#')[0].split('?')[0];
    if (!isCaseStudyHref(clean)) return;
    const slug = slugFromPath(clean);
    if (!slug) return;
    event.preventDefault();
    lastFocused = anchor as HTMLElement;
    void open(slug, true);
  });

  root.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Escape' && !overlay.hidden) close(true);
  });

  window.addEventListener('popstate', () => {
    const slug = slugFromPath(window.location.pathname);
    if (slug) void open(slug, false);
    else if (!overlay.hidden) close(false);
  });
}
