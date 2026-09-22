import { createRoot } from 'react-dom/client';
import { NameFlipBoard } from '../components/NameFlipBoard';

/**
 * Mounts the header wordmark's flip-board over the plain text already in the
 * markup. Every room calls this — the board is site chrome, not a Home
 * flourish — so it lives beside chrome.ts rather than in one page's entry.
 *
 * The `<span id="name-flip-root">Yosef Pilip</span>` inside
 * `<a class="wordmark">` is the no-JS state and stays readable on its own; this
 * only ever replaces it. A page without that span is simply skipped, which is
 * what keeps the call safe to make unconditionally from a shared entry.
 *
 * It is a .tsx file for the JSX alone — the `.ts` entries import it by
 * extensionless specifier and never see React themselves.
 *
 * The stylesheet is NOT imported here: nameFlip.css is a partial of
 * chrome.css, so every page that has a header already has the CSS. Importing
 * it here as well would ship it twice.
 */
export function initNameFlip(): void {
  const host = document.getElementById('name-flip-root');
  if (!host) return;
  createRoot(host).render(<NameFlipBoard />);
}
