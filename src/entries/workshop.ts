import { initAnalytics } from '../shared/analytics';
import { initChrome } from '../shared/chrome';
import { initMotion } from '../shared/motion';
import { initNameFlip } from '../shared/nameFlip';
import { initPhotoRail } from '../shared/photoRail';

initAnalytics();
initChrome();
initMotion();
initNameFlip();
initPhotoRail();

// Dev-only visual editing panel. The dynamic import inside this branch is what
// keeps it out of the production bundle — a static import would be bundled
// whether or not the branch runs.
if (import.meta.env.DEV) {
  import('../panel')
    .then((m) => m.initPanel())
    // Without this, a throw anywhere in the panel's install becomes an
    // unhandled rejection and the tool is simply, silently absent.
    .catch((err) => console.error('[panel] failed to initialise — the visual editor is not available:', err));
}
