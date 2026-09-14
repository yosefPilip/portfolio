import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { initCaseStudyRouting } from '../src/shared/caseStudy';

// The rail is part of the fetched page, and since it is now SHOWN in the
// overlay rather than hidden by CSS, its three link shapes — an in-page
// section link, "← All projects", and a link to another project's row on the
// index — are the fixture's whole point. All three arrive after page load, so
// nothing bound at load time has ever seen them.
const PAGE = `<!DOCTYPE html><html><body>
  <main class="cs">
    <aside class="cs-rail">
      <a id="railBack" class="cs-rail__back" href="/projects.html">&larr; All projects</a>
      <nav data-rail="sections">
        <a id="railIdea" href="#idea">The idea</a>
        <a id="railMissing" href="#does-not-exist">A section that is not here</a>
        <a id="railHashOnly" href="#">A bare hash</a>
      </nav>
      <nav data-rail="projects">
        <a id="railPodcast" href="/projects.html#podcast-generator">Batch Podcast Generator</a>
        <a id="railClean" href="/projects#podcast-generator">Same row, cleanUrls spelling</a>
      </nav>
    </aside>
    <div class="cs-body">
      <h1>Cache It</h1><p>The case study body.</p>
      <section id="idea"><h2>The idea</h2></section>
      <nav class="cs-next"><a id="csNext" class="cs-next__link" href="/projects.html#podcast-generator">Next</a></nav>
    </div>
  </main>
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
    <main id="siteMain">
      <a id="ext" href="https://cache-it-one.vercel.app">Live</a>
      <article id="podcast-generator">Batch Podcast Generator</article>
    </main>
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

/**
 * The rail now shows inside the overlay, so its links have to behave.
 *
 * jsdom implements no layout — getBoundingClientRect is all zeros and there is
 * no scrollIntoView on Element at all — so the scrolling ITSELF is proved in a
 * real browser, not here. What these assert is the observable contract around
 * it: which clicks are intercepted, what the history stack looks like
 * afterwards, and whether the overlay is still open. Those are exactly the
 * parts that were wrong in the shipped build.
 */
describe('the rail inside the overlay', () => {
  /** Open the overlay and hand back the anchor with this id inside it. */
  async function openWithRail(id: string): Promise<HTMLAnchorElement> {
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    const overlay = document.getElementById('csOverlay')!;
    await vi.waitFor(() => expect(overlay.hidden).toBe(false));
    const anchor = overlay.querySelector<HTMLAnchorElement>(`#${id}`);
    expect(anchor, `rail link #${id} is in the overlay`).not.toBeNull();
    return anchor!;
  }

  it('scrolls within the overlay for a section link instead of pushing history', async () => {
    const idea = await openWithRail('railIdea');
    const overlay = document.getElementById('csOverlay')!;

    const lengthBefore = history.length;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    idea.dispatchEvent(event);

    // Intercepted: the browser's own fragment jump would put
    // /projects/cache-it#idea on the stack, and Back from there re-enters the
    // popstate handler, which still yields a slug and re-renders the whole
    // overlay — losing the reader's place in the case study.
    expect(event.defaultPrevented).toBe(true);
    expect(history.length).toBe(lengthBefore);
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/projects/cache-it');

    // And the reader stays in the case study rather than being navigated out.
    expect(overlay.hidden).toBe(false);
  });

  it('closes the overlay for an other-projects link instead of navigating', async () => {
    const podcast = await openWithRail('railPodcast');
    const overlay = document.getElementById('csOverlay')!;
    const row = document.getElementById('podcast-generator')!;
    // jsdom ships no Element.scrollIntoView; getMotion() is null in this file,
    // so this is the branch that runs. Stubbed the way chrome.test.ts does.
    row.scrollIntoView = vi.fn();

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    podcast.dispatchEvent(event);

    // Intercepted, not navigated: the index is already underneath.
    expect(event.defaultPrevented).toBe(true);
    expect(overlay.hidden).toBe(true);
    expect(window.location.pathname).toBe('/projects.html');
    expect(window.location.hash).toBe('#podcast-generator');

    // The reader is taken to that row, and focus goes with them.
    expect(row.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(row);

    // Closing still has to hand the page back to keyboard and assistive tech.
    expect(document.getElementById('siteHeader')!.hasAttribute('inert')).toBe(false);
    expect(document.getElementById('siteMain')!.hasAttribute('inert')).toBe(false);
  });

  it('closes the overlay for the back link', async () => {
    const back = await openWithRail('railBack');
    const overlay = document.getElementById('csOverlay')!;

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    back.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(overlay.hidden).toBe(true);
    expect(window.location.pathname).toBe('/projects.html');
    expect(document.getElementById('siteHeader')!.hasAttribute('inert')).toBe(false);
  });

  it('leaves a modifier-click on a rail link alone, so it can open a new tab', async () => {
    const podcast = await openWithRail('railPodcast');
    const overlay = document.getElementById('csOverlay')!;

    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    podcast.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    // Nothing closed underneath the new tab the visitor just asked for.
    expect(overlay.hidden).toBe(false);
  });

  /**
   * The address bar must describe the document the visitor is actually on.
   *
   * The rail's markup always spells `/projects.html`, but vercel.json sets
   * cleanUrls, so in production that same document is served at `/projects`.
   * Pushing the href's own path component would stamp `/projects.html#row`
   * into the address bar of a `/projects` document — the exact dev/production
   * split that the captured indexPath and samePage() exist to prevent.
   *
   * In dev and in jsdom the two spellings coincide, which is why no browser
   * measurement could catch this. The fixture link therefore carries the
   * OPPOSITE spelling from the running document's, which is the only way to
   * tell "pushed the running path" apart from "pushed the href".
   */
  it('pushes the running document path, not the href spelling', async () => {
    const cleanSpelling = await openWithRail('railClean');
    const row = document.getElementById('podcast-generator')!;
    row.scrollIntoView = vi.fn();

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    cleanSpelling.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    // The href said `/projects`; this document is served at `/projects.html`.
    expect(window.location.pathname).toBe('/projects.html');
    expect(window.location.hash).toBe('#podcast-generator');
  });

  /**
   * A fragment the case study does not contain — a typo, or a section renamed
   * out from under the rail — must not reach the browser's default.
   *
   * The default jump pushes /projects/cache-it#whatever, and Back from there
   * re-enters the popstate handler, which still yields a slug and so re-fetches
   * and re-renders the whole overlay. That is precisely the failure this case
   * exists to prevent, so an unresolvable target has to fail closed.
   */
  it('swallows a fragment it cannot resolve rather than letting the browser jump', async () => {
    const missing = await openWithRail('railMissing');
    const overlay = document.getElementById('csOverlay')!;

    const lengthBefore = history.length;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    missing.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(history.length).toBe(lengthBefore);
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/projects/cache-it');
    expect(overlay.hidden).toBe(false);
  });

  // A bare `#` is the same hazard by another spelling: chrome.ts guards it
  // explicitly, and inside the overlay its default jump would push history too.
  it('swallows a bare # inside the overlay', async () => {
    const bare = await openWithRail('railHashOnly');
    const overlay = document.getElementById('csOverlay')!;

    const lengthBefore = history.length;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    bare.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(history.length).toBe(lengthBefore);
    expect(overlay.hidden).toBe(false);
  });

  // The handler binds the whole lifted <main>, so the end-of-article "Next"
  // link gets the same treatment as the rail's own — correct, and asserted so
  // the reach stays deliberate rather than incidental.
  it('gives the end-of-article Next link the same close-and-land behaviour', async () => {
    const next = await openWithRail('csNext');
    const overlay = document.getElementById('csOverlay')!;
    const row = document.getElementById('podcast-generator')!;
    row.scrollIntoView = vi.fn();

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    next.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(overlay.hidden).toBe(true);
    expect(window.location.hash).toBe('#podcast-generator');
  });

  /**
   * Landing on a row moves where the index IS, so it has to move where a later
   * close() goes back to. Otherwise: follow the rail to #podcast-generator,
   * open that row's case study, close it — and land back at the fragment
   * captured when the page first loaded, silently undoing the journey.
   */
  it('returns to the row a previous rail link landed on, not the load-time index', async () => {
    const podcast = await openWithRail('railPodcast');
    const row = document.getElementById('podcast-generator')!;
    row.scrollIntoView = vi.fn();
    podcast.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(window.location.hash).toBe('#podcast-generator');

    // Now open a case study again and close it the ordinary way.
    const overlay = document.getElementById('csOverlay')!;
    document.getElementById('go')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(overlay.hidden).toBe(false));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(overlay.hidden).toBe(true));

    expect(window.location.pathname).toBe('/projects.html');
    expect(window.location.hash).toBe('#podcast-generator');
  });

  it('ignores a rail link pointing at a row this page does not have', async () => {
    const podcast = await openWithRail('railPodcast');
    const overlay = document.getElementById('csOverlay')!;
    podcast.setAttribute('href', '/projects.html#not-a-real-row');

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    podcast.dispatchEvent(event);

    // Left as an ordinary link: closing onto an index that cannot show what
    // was asked for is worse than letting the browser navigate to it.
    expect(event.defaultPrevented).toBe(false);
    expect(overlay.hidden).toBe(false);
    podcast.setAttribute('href', '/projects.html#podcast-generator');
  });
});
