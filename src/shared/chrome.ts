import { installImageFallback } from '../lib/imageFrame';

/** Header behaviour, in-page anchors, and image placeholders. */
export function initChrome(): void {
  installImageFallback(document);

  const mobileMenu = document.getElementById('mobileMenu');
  const menuOpen = document.getElementById('menuOpen');
  const menuClose = document.getElementById('menuClose');

  menuOpen?.addEventListener('click', () => mobileMenu?.classList.add('is-open'));
  menuClose?.addEventListener('click', () => mobileMenu?.classList.remove('is-open'));

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
      mobileMenu?.classList.remove('is-open');
    });
  });
}
