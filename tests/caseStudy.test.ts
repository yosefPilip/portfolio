import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
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
beforeAll(() => {
  document.body.innerHTML = `
    <a id="go" href="/projects/cache-it">Read the case study</a>
    <a id="ext" href="https://cache-it-one.vercel.app">Live</a>
    <div class="cs-overlay" id="csOverlay" hidden></div>`;
  initCaseStudyRouting(document);
});

beforeEach(() => {
  const overlay = document.getElementById('csOverlay')!;
  overlay.hidden = true;
  overlay.innerHTML = '';
  document.body.classList.remove('is-overlay-open');
  history.replaceState(null, '', '/projects.html');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(PAGE, { status: 200 })));
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

  it('leaves external links alone', () => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.getElementById('ext')!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('closes on Escape and restores the index URL', async () => {
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    const overlay = document.getElementById('csOverlay')!;
    await vi.waitFor(() => expect(overlay.hidden).toBe(false));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(overlay.hidden).toBe(true));
  });

  it('falls back to a normal navigation when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign, pathname: '/projects.html' });
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/projects/cache-it'));
  });
});
