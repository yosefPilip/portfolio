import { createRoot } from 'react-dom/client';
import { IntroAnimation } from './components/IntroAnimation';
import { NameFlipBoard } from './components/NameFlipBoard';
import './styles/intro.css';
import './styles/nameFlip.css';

const introRoot = document.getElementById('intro-root');

if (introRoot) {
  createRoot(introRoot).render(<IntroAnimation />);
}

const nameFlipRoot = document.getElementById('name-flip-root');

if (nameFlipRoot) {
  createRoot(nameFlipRoot).render(<NameFlipBoard />);
}
