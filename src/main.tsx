import { createRoot } from 'react-dom/client';
import { IntroAnimation } from './components/IntroAnimation';
import './styles/intro.css';

const introRoot = document.getElementById('intro-root');

if (introRoot) {
  createRoot(introRoot).render(<IntroAnimation />);
}
