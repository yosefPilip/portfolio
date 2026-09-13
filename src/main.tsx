import { createRoot } from 'react-dom/client';
import { IntroAnimation } from './components/IntroAnimation';
import { NameFlipBoard } from './components/NameFlipBoard';
import { Coverflow } from './components/Coverflow';
import './styles/intro.css';
import './styles/nameFlip.css';
import './styles/coverflow.css';
import { initChrome } from './shared/chrome';
import { initMotion } from './shared/motion';

const introRoot = document.getElementById('intro-root');

if (introRoot) {
  createRoot(introRoot).render(<IntroAnimation />);
}

const nameFlipRoot = document.getElementById('name-flip-root');

if (nameFlipRoot) {
  createRoot(nameFlipRoot).render(<NameFlipBoard />);
}

const coverflowRoot = document.getElementById('coverflow-root');

if (coverflowRoot) {
  createRoot(coverflowRoot).render(<Coverflow />);
}

// Only a migrated page opts into the new runtime. music.html still loads the
// site.ts shim and has no data-room, so without this guard Lenis would
// install on a page whose stylesheet was deleted, chrome.ts would hijack its
// in-page anchors, and it would fall back to the home palette. Plan 3 adds
// data-room to music.html as it is rebuilt.
if (document.body.dataset.room) {
  initChrome();
  initMotion();
}
