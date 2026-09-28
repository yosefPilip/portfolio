import { createRoot } from 'react-dom/client';
import { IntroAnimation } from './components/IntroAnimation';
import './styles/intro.css';
import { initAnalytics } from './shared/analytics';
import { initChrome } from './shared/chrome';
import { initMotion } from './shared/motion';
import { initNameFlip } from './shared/nameFlip';
import { initNowTicker } from './shared/nowTicker';

const introRoot = document.getElementById('intro-root');

if (introRoot) {
  createRoot(introRoot).render(<IntroAnimation />);
}

// main.tsx is Home's entry only — index.html is its sole loader and always
// carries data-room="home" — so the old "only a migrated page opts in" guard
// here was dead code as of this file no longer being shared with music.html.
// Home always has a .stack (the hero), so both calls are unconditional.
initAnalytics();
initChrome();
initMotion();
initNameFlip();
initNowTicker();

// Dev-only visual editing panel. The dynamic import inside this branch is what
// keeps it out of the production bundle — a static import would be bundled
// whether or not the branch runs.
if (import.meta.env.DEV) {
  import('./panel')
    .then((m) => m.initPanel())
    // Without this, a throw anywhere in the panel's install becomes an
    // unhandled rejection and the tool is simply, silently absent.
    .catch((err) => console.error('[panel] failed to initialise — the visual editor is not available:', err));
}
