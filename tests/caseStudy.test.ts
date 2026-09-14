import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { initCaseStudyRouting } from '../src/shared/caseStudy';

const PAGE = `<!DOCTYPE html><html><body>
  <main><h1>Cache It</h1><p>The case study body.</p></main>
</body></html>`;

// initCaseStudyRouting delegates click/keydown on `document` and popstate on
// `window` — the right call for a feature that has to catch a case-study link
// anywhere on the page, and exactly how it runs in production: once per real
// page load. Vitest shares one jsdom document/window across every test in
// this file, so re-running init in a per-test beforeEach (after rebuilding
// the DOM, as the brief's own draft did) stacks a fresh set of listeners on
// top of every previous test's — and the click handler's own
// `event.defaultPrevented` guard then makes every listener but the very
// first silently no-op, since one shared Event object is threaded through
// all of them in registration order. Wiring it once in beforeAll and
// resetting only the DOM's state in beforeEach mirrors real usage and avoids
// that pollution without touching the module under test.
//
// The index path is set BEFORE init, not just in beforeEach: the module
// captures its "back to index" URL once, at init time, so the tests that
// rely on that captured value (closing, or Back navigating past the
// overlay) need it to already be '/projects.html' the moment
// initCaseStudyRouting runs.
beforeAll(() => {
  history.replaceState(null, '', '/projects.html');
  // A real <header>/<main>/<footer> triple, not just the two anchors the
  // fixture used to carry — BACKGROUND ('header, main, footer') is a
  // document-wide selector, and a fixture with none of those elements can
  // never catch a sweep that is scoped wrong, because querySelectorAll
  // against them always returns an empty list either way.
  document.body.innerHTML = `
    <header id="siteHeader"><a id="go" href="/projects/cache-it">Read the case study</a></header>
    <main id="siteMain"><a id="ext" href="https://cache-it-one.vercel.app">Live</a></main>
    <footer id="siteFooter"></footer>
    <div class="cs-overlay" id="csOverlay" hidden></div>`;
  initCaseStudyRouting(document);
});

beforeEach(() => {
  const overlay = document.getElementById('csOverlay')!;
  overlay.hidden = true;
  overlay.innerHTML = '';
  document.body.classList.remove('is-overlay-open');
  // The DOM is shared across every test in this file, so a test that opens
  // the overlay without closing it would leave the landmarks inert for
  // everything after it — and an inert assertion that is already true before
  // the code under test runs proves nothing.
  document.querySelectorAll('[inert]').forEach((el) => el.removeAttribute('inert'));
  history.replaceState(null, '', '/projects.html');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(PAGE, { status: 200 })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('case study overlay', () => {
  it('intercepts a case-study link and pushes the clean URL', async () => {
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(window.location.pathname).toBe('/projects/cache-it'));
  });

  it('lifts the fetched page main into the overlay', async () => {
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    const overlay = document.getElementById('csOverlay')!;
    await vi.waitFor(() => expect(overlay.textContent).toContain('The case study body.'));
    expect(overlay.hidden).toBe(false);
  });

  it('inerts the page background but leaves the overlay\'s own <main> reachable', async () => {
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    const overlay = document.getElementById('csOverlay')!;
    await vi.waitFor(() => expect(overlay.hidden).toBe(false));

    // The page's real header/main/footer sit behind the overlay and must be
    // taken out of the tab order and hidden from assistive tech.
    expect(document.getElementById('siteHeader')!.hasAttribute('inert')).toBe(true);
    expect(document.getElementById('siteMain')!.hasAttribute('inert')).toBe(true);
    expect(document.getElementById('siteFooter')!.hasAttribute('inert')).toBe(true);

    // The overlay's own lifted <main> matches the same 'header, main, footer'
    // selector — a sweep that does not exclude the overlay's subtree makes
    // the case study itself unreachable by keyboard or screen reader.
    const overlayMain = overlay.querySelector('main');
    expect(overlayMain).not.toBeNull();
    expect(overlayMain!.hasAttribute('inert')).toBe(false);
  });

  it('leaves external links alone', () => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.getElementById('ext')!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('closes on Escape and restores the index URL', async () => {
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    const overlay = document.getElementById('csOverlay')!;
    await vi.waitFor(() => expect(overlay.hidden).toBe(false));
    // Inert has to be ON first, or "no longer inert" after close is vacuous.
    expect(document.getElementById('siteHeader')!.hasAttribute('inert')).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(overlay.hidden).toBe(true));
    expect(window.location.pathname).toBe('/projects.html');

    // The close direction is the one that strands a visitor: a background
    // left inert after the overlay goes away is a page nothing can be
    // clicked or read on, and jsdom renders nothing so it is invisible here
    // unless it is asserted outright.
    expect(document.getElementById('siteHeader')!.hasAttribute('inert')).toBe(false);
    expect(document.getElementById('siteMain')!.hasAttribute('inert')).toBe(false);
    expect(document.getElementById('siteFooter')!.hasAttribute('inert')).toBe(false);
  });

  it('falls back to a normal navigation when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign, pathname: '/projects.html' });
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/projects/cache-it'));
  });

  it('going back while the overlay is open closes it without pushing another history entry', async () => {
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    const overlay = document.getElementById('csOverlay')!;
    await vi.waitFor(() => expect(overlay.hidden).toBe(false));

    expect(document.getElementById('siteHeader')!.hasAttribute('inert')).toBe(true);

    const lengthBeforeBack = history.length;
    history.replaceState(null, '', '/projects.html');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(overlay.hidden).toBe(true);
    expect(history.length).toBe(lengthBeforeBack);

    // Same contract on the Back path: closing without pushing still has to
    // hand the page back to the keyboard and to assistive tech.
    expect(document.getElementById('siteHeader')!.hasAttribute('inert')).toBe(false);
    expect(document.getElementById('siteMain')!.hasAttribute('inert')).toBe(false);
    expect(document.getElementById('siteFooter')!.hasAttribute('inert')).toBe(false);
  });

  it('a forward navigation via popstate opens the overlay for that slug', async () => {
    history.replaceState(null, '', '/projects/cache-it');
    window.dispatchEvent(new PopStateEvent('popstate'));

    const overlay = document.getElementById('csOverlay')!;
    await vi.waitFor(() => expect(overlay.hidden).toBe(false));
    expect(overlay.textContent).toContain('The case study body.');
  });

  it('a Back navigation during an in-flight open is not overridden once the fetch resolves', async () => {
    let resolveFetch!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => { resolveFetch = resolve; })),
    );

    // Click starts an open() for cache-it; its fetch is deliberately left
    // pending so Back can land while it is still in flight.
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    // Back, pressed before the fetch above resolves.
    history.replaceState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));

    // Now the slow fetch resolves.
    resolveFetch(new Response(PAGE, { status: 200 }));
    // Flush the resolved fetch's own promise chain (await response.text(),
    // DOMParser, etc.) before asserting on the settled state.
    await new Promise((r) => setTimeout(r, 0));

    expect(window.location.pathname).toBe('/');
    const overlay = document.getElementById('csOverlay')!;
    expect(overlay.hidden).toBe(true);
  });
});
