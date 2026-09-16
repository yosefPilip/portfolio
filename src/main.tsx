import { createRoot } from 'react-dom/client';
import { IntroAnimation } from './components/IntroAnimation';
import { NameFlipBoard } from './components/NameFlipBoard';
import './styles/intro.css';
import './styles/nameFlip.css';
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

// main.tsx is Home's entry only — index.html is its sole loader and always
// carries data-room="home" — so the old "only a migrated page opts in" guard
// here was dead code as of this file no longer being shared with music.html.
// Home always has a .stack (the hero), so both calls are unconditional.
initChrome();
initMotion();

// Dev-only visual editing panel. The dynamic import inside this branch is what
// keeps it out of the production bundle — a static import would be bundled
// whether or not the branch runs.
if (import.meta.env.DEV) {
  import('./panel').then((m) => m.initPanel());
}
