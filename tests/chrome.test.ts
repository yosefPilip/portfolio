import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// chrome.ts asks the motion layer to freeze the background while the menu is
// open, and to do the scrolling for in-page anchors. Mock it so no real Lenis
// is ever constructed here, and so the calls are observable.
const motion = { lenis: {}, stop: vi.fn(), start: vi.fn(), scrollTo: vi.fn(), destroy: vi.fn() };
let currentMotion: typeof motion | null = motion;

vi.mock('../src/shared/motion', () => ({
  getMotion: () => currentMotion,
}));

import { initChrome } from '../src/shared/chrome';

const MARKUP = `
  <header class="site-header">
    <a class="wordmark" href="/">Yosef Pilip</a>
    <button class="menu-toggle" id="menuOpen" aria-label="Open menu"
            aria-expanded="false" aria-controls="mobileMenu"></button>
  </header>
  <div class="mobile-menu" id="mobileMenu">
    <button class="mobile-menu__close" id="menuClose" aria-label="Close menu"></button>
    <a href="/projects.html">Projects</a>
  </div>
  <main>
    <a id="jump" href="#about">About</a>
    <a id="badFragment" href="#2fa">Two factor</a>
    <a id="bareHash" href="#">Nowhere</a>
    <section id="about">About</section>
  </main>
  <footer></footer>
`;

const menuOpen = () => document.getElementById('menuOpen') as HTMLButtonElement;
const menuClose = () => document.getElementById('menuClose') as HTMLButtonElement;
const mobileMenu = () => document.getElementById('mobileMenu') as HTMLElement;
const backgroundRegions = () => Array.from(document.querySelectorAll('header, main, footer'));

function pressEscape(): void {
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

beforeEach(() => {
  vi.clearAllMocks();
  currentMotion = motion;
  document.body.innerHTML = MARKUP;
  document.body.className = '';
  initChrome();
  // jsdom cannot navigate; without this the cross-page menu link logs
  // "Not implemented: navigation to another Document" over the run.
  document.addEventListener('click', (event) => event.preventDefault());
});

afterEach(() => {
  document.body.innerHTML = '';
  document.body.className = '';
});

describe('initChrome — mobile menu open/close contract', () => {
  it('starts closed, with the opener advertising a collapsed, controlled menu', () => {
    expect(menuOpen().getAttribute('aria-expanded')).toBe('false');
    expect(menuOpen().getAttribute('aria-controls')).toBe('mobileMenu');
    expect(document.getElementById(menuOpen().getAttribute('aria-controls')!)).toBe(mobileMenu());
    expect(mobileMenu().classList.contains('is-open')).toBe(false);
  });

  it('opening flips aria-expanded, moves focus into the menu, inerts the background and locks scroll', () => {
    menuOpen().click();

    expect(mobileMenu().classList.contains('is-open')).toBe(true);
    expect(menuOpen().getAttribute('aria-expanded')).toBe('true');

    // Focus must LEAVE the opener: it now sits behind a z-index 95 overlay.
    expect(document.activeElement).toBe(menuClose());

    // Background is out of the tab order and hidden from assistive tech.
    backgroundRegions().forEach((el) => expect(el.hasAttribute('inert')).toBe(true));
    expect(mobileMenu().hasAttribute('inert')).toBe(false);

    // Scroll lock, both halves: the CSS fallback and the Lenis instance.
    expect(document.body.classList.contains('is-menu-open')).toBe(true);
    expect(motion.stop).toHaveBeenCalledTimes(1);
  });

  it('closing restores aria-expanded, focus, the background and scrolling', () => {
    menuOpen().click();
    menuClose().click();

    expect(mobileMenu().classList.contains('is-open')).toBe(false);
    expect(menuOpen().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(menuOpen());
    backgroundRegions().forEach((el) => expect(el.hasAttribute('inert')).toBe(false));
    expect(document.body.classList.contains('is-menu-open')).toBe(false);
    expect(motion.start).toHaveBeenCalledTimes(1);
  });

  it('Escape closes an open menu', () => {
    menuOpen().click();
    pressEscape();

    expect(mobileMenu().classList.contains('is-open')).toBe(false);
    expect(menuOpen().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(menuOpen());
  });

  it('Escape on an already-closed menu neither reopens it nor steals focus', () => {
    const jump = document.getElementById('jump') as HTMLAnchorElement;
    jump.focus();
    pressEscape();

    expect(mobileMenu().classList.contains('is-open')).toBe(false);
    expect(document.activeElement).toBe(jump);
    expect(motion.start).not.toHaveBeenCalled();
  });

  it('following a link out of the menu closes it, so no stale scroll lock survives', () => {
    menuOpen().click();
    (mobileMenu().querySelector('a') as HTMLAnchorElement).click();

    expect(mobileMenu().classList.contains('is-open')).toBe(false);
    expect(document.body.classList.contains('is-menu-open')).toBe(false);
  });

  it('works with no Lenis at all — the reduced-motion path still locks and unlocks', () => {
    currentMotion = null;

    menuOpen().click();
    expect(document.body.classList.contains('is-menu-open')).toBe(true);
    expect(document.activeElement).toBe(menuClose());

    menuClose().click();
    expect(document.body.classList.contains('is-menu-open')).toBe(false);
  });
});

describe('initChrome — in-page anchors', () => {
  it('scrolls through Lenis rather than running a second smoothing curve', () => {
    const target = document.getElementById('about')!;
    target.scrollIntoView = vi.fn();

    (document.getElementById('jump') as HTMLAnchorElement).click();

    expect(motion.scrollTo).toHaveBeenCalledWith(target);
    expect(target.scrollIntoView).not.toHaveBeenCalled();
  });

  it('falls back to native smooth scrolling when no Lenis exists', () => {
    currentMotion = null;
    const target = document.getElementById('about')!;
    target.scrollIntoView = vi.fn();

    (document.getElementById('jump') as HTMLAnchorElement).click();

    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('survives a fragment that is not a valid CSS selector', () => {
    // `document.querySelector("#2fa")` throws SyntaxError: an id may start with
    // a digit in HTML, but such a selector must be escaped.
    expect(() => (document.getElementById('badFragment') as HTMLAnchorElement).click()).not.toThrow();
    expect(motion.scrollTo).not.toHaveBeenCalled();
  });

  it('still resolves that same fragment when the element actually exists', () => {
    const odd = document.createElement('div');
    odd.id = '2fa';
    document.body.appendChild(odd);

    (document.getElementById('badFragment') as HTMLAnchorElement).click();

    expect(motion.scrollTo).toHaveBeenCalledWith(odd);
  });

  it('survives a percent-encoding that decodeURIComponent rejects', () => {
    const broken = document.createElement('a');
    broken.id = 'brokenEscape';
    broken.setAttribute('href', '#%E0%A4%A');
    document.body.querySelector('main')!.appendChild(broken);
    initChrome(); // pick up the newly added anchor

    expect(() => broken.click()).not.toThrow();
  });

  it('ignores a bare "#" href', () => {
    expect(() => (document.getElementById('bareHash') as HTMLAnchorElement).click()).not.toThrow();
    expect(motion.scrollTo).not.toHaveBeenCalled();
  });

  it('closes the menu when an in-page anchor is followed while it is open', () => {
    menuOpen().click();
    (document.getElementById('jump') as HTMLAnchorElement).click();

    expect(mobileMenu().classList.contains('is-open')).toBe(false);
    expect(document.body.classList.contains('is-menu-open')).toBe(false);
  });
});
