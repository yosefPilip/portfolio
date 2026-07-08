import { useEffect, useState } from 'react';
import { FlipBoard } from './FlipBoard';
import { BOARD_COLUMNS, BOARD_ROWS, INTRO_VARIANTS } from '../data/introMessages';

const SETTLE_BUFFER_MS = 900;
const SCREEN_HOLD_MS = 1800;
const FADE_DURATION_MS = 800;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function IntroAnimation() {
  const [reducedMotion] = useState(prefersReducedMotion);
  const [variant] = useState(() => INTRO_VARIANTS[Math.floor(Math.random() * INTRO_VARIANTS.length)]);
  const [screenIndex, setScreenIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(() => !reducedMotion);

  useEffect(() => {
    if (!visible || fading) return;
    const isLastScreen = screenIndex === variant.screens.length - 1;
    const timer = window.setTimeout(() => {
      if (isLastScreen) {
        setFading(true);
      } else {
        setScreenIndex((index) => index + 1);
      }
    }, SETTLE_BUFFER_MS + SCREEN_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [screenIndex, fading, visible, variant]);

  useEffect(() => {
    if (!fading) return;
    const timer = window.setTimeout(() => setVisible(false), FADE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [fading]);

  if (!visible) return null;

  return (
    <div className={`intro-overlay${fading ? ' intro-overlay--fading' : ''}`}>
      <FlipBoard lines={variant.screens[screenIndex]} rows={BOARD_ROWS} columns={BOARD_COLUMNS} />
    </div>
  );
}
