import { installImageFallback } from '../lib/imageFrame';
import { getMotion } from './motion';

/** Regions hidden from AT and taken out of the tab order while the menu is open. */
const BACKGROUND = 'header, main, footer';

/**
 * Resolve an in-page `#fragment` to its element.
 *
 * The old `document.querySelector(href)` threw SyntaxError on `#2fa`: an id may
 * start with a digit in HTML, but such a selector must be escaped — and one
 * throw took the whole click handler with it.
 *
 * getElementById is used rather than querySelector + CSS.escape because it
 * takes an id, not a selector: there is no selector grammar to violate, so it
 * cannot throw at all. The try/catch then only has to cover decodeURIComponent,
 * which throws URIError on a malformed escape such as `#%E0%A4%A`.
 */
function resolveFragment(href: string): Element | null {
  try {
    return document.getElementById(decodeURIComponent(href.slice(1)));
  } catch {
    return null;
  }
}

/** Header behaviour, in-page anchors, and image placeholders. */
export function initChrome(): void {
  installImageFallback(document);

  const mobileMenu = document.getElementById('mobileMenu');
  const menuOpen = document.getElementById('menuOpen');
  const menuClose = document.getElementById('menuClose');

  const isOpen = (): boolean => mobileMenu?.classList.contains('is-open') ?? false;

  function openMenu(): void {
    if (!mobileMenu) return;
    mobileMenu.classList.add('is-open');
    menuOpen?.setAttribute('aria-expanded', 'true');

    // Background scroll lock. Lenis's virtual scroll ignores body overflow, so
    // it has to be stopped explicitly; the body class is the CSS fallback for
    // the reduced-motion path, where no Lenis instance exists at all.
    document.body.classList.add('is-menu-open');
    getMotion()?.stop();

    // The opener now sits behind a z-index: 95 overlay, so leaving focus on it
    // strands the keyboard user. inert on the background both removes it from
    // the tab order and hides it from assistive tech, which is the focus trap.
    document.querySelectorAll(BACKGROUND).forEach((el) => el.setAttribute('inert', ''));
    menuClose?.focus();
  }

  function closeMenu(): void {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('is-open');
    menuOpen?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-menu-open');
    getMotion()?.start();

    // Un-inert BEFORE focusing, or the focus call lands on an inert element.
    document.querySelectorAll(BACKGROUND).forEach((el) => el.removeAttribute('inert'));
    menuOpen?.focus();
  }

  menuOpen?.addEventListener('click', openMenu);
  menuClose?.addEventListener('click', closeMenu);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      event.preventDefault();
      closeMenu();
    }
  });

  // Navigating away from the menu closes it, so returning via the back button
  // never restores a page with a stale scroll lock.
  mobileMenu?.querySelectorAll('a').forEach((anchor) => {
    anchor.addEventListener('click', closeMenu);
  });

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = resolveFragment(href);
      if (target) {
        event.preventDefault();
        // One smoothing curve, not two: native scrollIntoView and Lenis both
        // drive scrollTop and visibly fight if the user wheels mid-animation.
        const motion = getMotion();
        if (motion) motion.scrollTo(target);
        else target.scrollIntoView({ behavior: 'smooth' });
      }
      if (isOpen()) closeMenu();
    });
  });
}
