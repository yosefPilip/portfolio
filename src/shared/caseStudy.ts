import { isCaseStudyHref, slugFromPath, pathForSlug } from '../lib/caseStudyRoute';

/**
 * Tier 3. A case-study link opens an animated overlay without a reload AND
 * pushes /projects/<slug> into the address bar. The same URL cold-loads as a
 * real page, so it stays shareable and indexable. Back closes the overlay.
 */
export function initCaseStudyRouting(root: Document): void {
  const overlay = root.getElementById('csOverlay');
  if (!overlay) return;

  let lastFocused: HTMLElement | null = null;

  function close(push: boolean): void {
    overlay!.hidden = true;
    overlay!.innerHTML = '';
    root.body.classList.remove('is-overlay-open');
    if (push) history.pushState({ cs: null }, '', '/projects.html');
    lastFocused?.focus();
  }

  async function open(slug: string, push: boolean): Promise<void> {
    const path = pathForSlug(slug);
    try {
      const response = await fetch(`${path}.html`);
      if (!response.ok) throw new Error(String(response.status));
      const markup = await response.text();
      const parsed = new DOMParser().parseFromString(markup, 'text/html');
      const main = parsed.querySelector('main');
      if (!main) throw new Error('no main');

      overlay!.innerHTML = '';
      const closeButton = root.createElement('button');
      closeButton.className = 'cs-close';
      closeButton.setAttribute('aria-label', 'Close case study');
      closeButton.textContent = '✕';
      closeButton.addEventListener('click', () => close(true));
      overlay!.append(closeButton, main);

      overlay!.hidden = false;
      root.body.classList.add('is-overlay-open');
      if (push) history.pushState({ cs: slug }, '', path);
      closeButton.focus();
    } catch {
      // Anything unexpected: fall back to a plain navigation rather than
      // leaving the visitor on a page whose link appeared to do nothing.
      window.location.assign(path);
    }
  }

  root.addEventListener('click', (event) => {
    const mouse = event as MouseEvent;
    if (mouse.defaultPrevented || mouse.button !== 0 || mouse.metaKey || mouse.ctrlKey || mouse.shiftKey) return;
    const anchor = (event.target as HTMLElement | null)?.closest?.('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || !isCaseStudyHref(href)) return;
    const slug = slugFromPath(href);
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
