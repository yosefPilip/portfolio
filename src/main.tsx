import { createRoot } from 'react-dom/client';
import { IntroAnimation } from './components/IntroAnimation';
import { NameFlipBoard } from './components/NameFlipBoard';
import { Coverflow } from './components/Coverflow';
import './styles/intro.css';
import './styles/nameFlip.css';
import './styles/coverflow.css';

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
