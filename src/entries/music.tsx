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
