import { initChrome } from '../shared/chrome';
import { initMotion } from '../shared/motion';

initChrome();
initMotion();

// Dev-only visual editing panel. The dynamic import inside this branch is what
// keeps it out of the production bundle — a static import would be bundled
// whether or not the branch runs.
if (import.meta.env.DEV) {
  import('../panel').then((m) => m.initPanel());
}
