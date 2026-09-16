import { createRoot } from 'react-dom/client';
import { Coverflow } from '../components/Coverflow';
import { initChrome } from '../shared/chrome';
import { initMotion } from '../shared/motion';

initChrome();
initMotion();

const coverflowRoot = document.getElementById('coverflow-root');
if (coverflowRoot) {
  createRoot(coverflowRoot).render(<Coverflow />);
}

// Dev-only visual editing panel. The dynamic import inside this branch is what
// keeps it out of the production bundle — a static import would be bundled
// whether or not the branch runs.
if (import.meta.env.DEV) {
  import('../panel').then((m) => m.initPanel());
}
