import { isCaseStudyHref, slugFromPath, pathForSlug } from '../lib/caseStudyRoute';
import { getMotion } from './motion';

/** Regions hidden from AT and taken out of the tab order while the overlay is open. */
const BACKGROUND = 'header, main, footer';

/**
 * Do two paths address the same page?
 *
 * `/projects.html` and `/projects` are the same document: `vite dev` serves the
 * first, Vercel's cleanUrls serves the second, and the case study's rail always
 * spells the first in its markup. Comparing the two raw would make the rail's
 * links close the overlay in dev and hard-navigate in production — the sort of
 * split the captured `indexPath` below already exists to avoid.
 */
function samePage(a: string, b: string): boolean {
  const normalise = (path: string): string => path.replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  return normalise(a) === normalise(b);
}

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
  // Reassigned, not const: this is "where close() returns to", and the rail's
  // other-projects links genuinely move it. After one of those closes the
  // overlay onto #resell-assistant, the index IS at that row — so opening a
  // second case study from there and closing it must come back to the row,
  // not to the fragment captured when the page first loaded.
  let indexPath = window.location.pathname + window.location.hash;

  // The same address without the arrival fragment. `indexPath` is what close()
  // restores and must keep its hash; recognising the rail's "back to the index"
  // links is a comparison of paths alone, and a visitor who arrived at
  // `/projects.html#cloudgeometry` must not stop those links working. Derived
  // here rather than re-read at click time so both uses come from one capture.
  const indexPagePath = window.location.pathname;

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

  /**
   * The element carrying `rawId` that the caller is willing to accept.
   *
   * Not `root.getElementById`: while the overlay is open the document holds the
   * index page AND the lifted case study, and getElementById returns only the
   * first match in document order — so a shared id resolves to whichever half
   * happens to come first, which is the wrong one half the time. Not
   * `querySelector('#' + id)` either: chrome.ts documents why an id such as
   * `2fa` makes that throw SyntaxError and take the whole handler with it.
   * Walking a page's `[id]` elements has neither failure mode, and the
   * predicate is how the caller says which side of the overlay it wants.
   */
  function findById(rawId: string, accept: (el: HTMLElement) => boolean): HTMLElement | null {
    let id: string;
    try {
      id = decodeURIComponent(rawId);
    } catch {
      // A malformed escape such as `#%E0%A4%A`. Not a target, but not a crash.
      return null;
    }
    if (!id) return null;
    return (
      Array.from(root.querySelectorAll<HTMLElement>('[id]')).find(
        (el) => el.id === id && accept(el),
      ) ?? null
    );
  }

  /**
   * Scroll the OVERLAY to `target` — not the window.
   *
   * Inside the overlay #csOverlay is the scroll container and the document
   * behind it is deliberately stopped. scrollIntoView() would drive that
   * stopped document too, and getMotion().scrollTo() drives the window only;
   * neither moves the box that actually scrolls here. The smoothing comes from
   * .cs-overlay { scroll-behavior: smooth } in projects.css, which keeps the
   * reduced-motion preference in the one place that already honours it instead
   * of adding a second matchMedia read to this module.
   */
  function scrollOverlayTo(target: HTMLElement): void {
    overlay!.scrollTop +=
      target.getBoundingClientRect().top - overlay!.getBoundingClientRect().top;
  }

  /**
   * Wire the rail the overlay now shows.
   *
   * Bound on the lifted <main>, not on the document, for two reasons. These
   * links arrive after page load, so initChrome()'s one-shot `a[href^="#"]`
   * sweep has never seen them and something has to supply the behaviour at
   * all. And scoping the listener to the lifted node is exactly what keeps the
   * cold-loaded standalone page honest: none of this module's overlay code
   * runs at /projects/cache-it, so there the identical markup stays a set of
   * ordinary links that navigate and jump the way the browser would.
   *
   * Named for the overlay rather than the rail because it reaches further than
   * the rail by design: the whole lifted <main> is bound, which also catches
   * the end-of-article `.cs-next__link` — itself a `/projects.html#slug` link,
   * and one a reader is MORE likely to click than the rail, having just
   * finished the piece. Treating it identically is the point; the name says so
   * rather than leaving the extra reach to be discovered.
   */
  function bindOverlayLinks(main: HTMLElement): void {
    main.addEventListener('click', (event) => {
      const mouse = event as MouseEvent;
      // The same guard the case-study interceptor above uses: a modifier or
      // middle click is a request for a new tab and must stay a real link.
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

      // (a) A section link. Scroll the overlay's own container and push
      //     nothing. Left to the browser, the fragment jump would add
      //     /projects/cache-it#idea to history — and a later Back lands on
      //     the popstate handler below, which still yields a slug and so
      //     re-fetches and re-renders the entire overlay, dropping the reader
      //     at the top of a case study they were halfway down.
      if (href.startsWith('#')) {
        // preventDefault BEFORE the lookup, so an id the case study does not
        // carry — a typo, a section renamed out from under the rail, or a bare
        // `#` — fails CLOSED. Letting one fall through to the browser is the
        // one outcome this case cannot afford: the default jump pushes
        // /projects/cache-it#whatever, and Back from there is the very
        // re-render described above. A bare `#` needs no separate branch;
        // findById returns null for an empty id and nothing happens.
        event.preventDefault();
        const target = findById(href.slice(1), (el) => overlay!.contains(el));
        if (target) scrollOverlayTo(target);
        return;
      }

      const clean = href.split('#')[0].split('?')[0];
      if (!samePage(clean, indexPagePath)) return;

      const hashAt = href.indexOf('#');
      const rowId = hashAt === -1 ? '' : href.slice(hashAt + 1);

      // (b) ← All projects. The index is already underneath the overlay, so
      //     closing IS the navigation; letting the link run would re-download
      //     a page the visitor is standing on. close(true) is what the ✕ and
      //     Escape already do, focus restore included.
      if (!rowId) {
        event.preventDefault();
        close(true);
        return;
      }

      // (c) Another project. Close onto the index and land on that row.
      //     Resolved BEFORE closing, and explicitly outside the overlay: if
      //     this page does not actually carry the row, the link is left alone
      //     to navigate rather than closing onto a page missing its target.
      const row = findById(rowId, (el) => !overlay!.contains(el));
      if (!row) return;
      event.preventDefault();

      // close()'s focus restore would send focus back to the "Read the case
      // study" anchor and scroll the page to it, undoing the scroll below.
      // This click is going somewhere else, so focus goes with it instead.
      lastFocused = null;
      // close(false) then one push of the row's own address: close(true)
      // would push the index first, leaving two history entries for one click.
      close(false);

      // The RUNNING document's path plus the incoming fragment — never the
      // href's own path component. The rail's markup always spells
      // `/projects.html`, but vercel.json sets cleanUrls, so in production this
      // very document is served at `/projects`; pushing the href verbatim would
      // stamp `/projects.html#row` into the address bar of a `/projects` page.
      // samePage() above already accepted the two spellings as equal — this is
      // the other half of that, and without it the module normalises for the
      // comparison and then leaks the markup's spelling into the address.
      indexPath = indexPagePath + href.slice(hashAt);
      history.pushState({ cs: null }, '', indexPath);

      // An <article> is not focusable on its own, so the skip-link pattern:
      // a programmatic tabindex, and preventScroll so the browser's
      // scroll-on-focus does not pre-empt the smooth scroll that follows.
      if (!row.hasAttribute('tabindex')) row.setAttribute('tabindex', '-1');
      row.focus({ preventScroll: true });

      // Back on the page proper, so this one goes through the motion layer
      // the rest of the site's in-page links use.
      const motion = getMotion();
      if (motion) motion.scrollTo(row);
      else row.scrollIntoView({ behavior: 'smooth' });
    });
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

      // After the append, so the links are bound while they are in this
      // document rather than still in the DOMParser's.
      bindOverlayLinks(main);

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
