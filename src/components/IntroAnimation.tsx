import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { FlipBoard } from './FlipBoard';
import { getBoardConfig, INTRO_VARIANTS, wrapScreenLines } from '../data/introMessages';

const MOBILE_BREAKPOINT_PX = 640;
const INTRO_SESSION_KEY = 'yp-intro-shown';

// ── Tune these to change the intro's pacing ──────────────────────────────────────────────────
// Must cover the slowest cell's flip-out + stagger + flip-in (see FlipBoard.tsx /
// FlipCell.tsx, ~1.2s worst case), or the next screen starts before this one finishes.
const SETTLE_BUFFER_MS = 1400;
// Same idea, but for the final blank screen, which only flips OUT (nothing flips back in).
// This is the main knob for "how long after the name flips away before the site appears" —
// BLANK_HOLD_MS alone won't move much unless this is also small.
const OUTRO_SETTLE_MS = 500;
const SCREEN_HOLD_MS = 1500; // how long a settled message stays on screen before flipping away
const BLANK_HOLD_MS = 100; // how long the board stays blank after flipping out, before fading
const FADE_DURATION_MS = 500; // how long the overlay fade-out takes, revealing the site
// ──────────────────────────────────────────────────────────────────────

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isMobileViewport(): boolean {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
}

// sessionStorage (not localStorage) so the intro plays again in a fresh tab,
// but not every time you navigate back to / within the same tab.
function hasSeenIntroThisSession(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_SESSION_KEY, '1');
  } catch {
    // storage unavailable (e.g. private browsing) — worst case the intro replays
  }
}

export function IntroAnimation() {
  const [reducedMotion] = useState(prefersReducedMotion);
  const [variant] = useState(() => INTRO_VARIANTS[Math.floor(Math.random() * INTRO_VARIANTS.length)]);
  const [screenIndex, setScreenIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(() => {
    if (reducedMotion || hasSeenIntroThisSession()) return false;
    markIntroSeen();
    return true;
  });
  const [isMobile, setIsMobile] = useState(isMobileViewport);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const { columns, rows } = useMemo(() => getBoardConfig(isMobile), [isMobile]);

  const totalScreens = variant.screens.length + 1;
  const isBlankScreen = screenIndex >= variant.screens.length;
  const rawLines = isBlankScreen ? [] : variant.screens[screenIndex];
  const currentLines = useMemo(() => wrapScreenLines(rawLines, columns), [rawLines, columns]);

  useEffect(() => {
    if (!visible || fading) return;
    const isLastScreen = screenIndex === totalScreens - 1;
    const settleMs = isBlankScreen ? OUTRO_SETTLE_MS : SETTLE_BUFFER_MS;
    const holdMs = isBlankScreen ? BLANK_HOLD_MS : SCREEN_HOLD_MS;
    const timer = window.setTimeout(() => {
      if (isLastScreen) {
        setFading(true);
      } else {
        setScreenIndex((index) => index + 1);
      }
    }, settleMs + holdMs);
    return () => window.clearTimeout(timer);
  }, [screenIndex, fading, visible, totalScreens, isBlankScreen]);

  useEffect(() => {
    if (!fading) return;
    const timer = window.setTimeout(() => setVisible(false), FADE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [fading]);

  if (!visible) return null;

  const overlayStyle = { '--intro-fade-ms': `${FADE_DURATION_MS}ms` } as CSSProperties;

  return (
    <div className={`intro-overlay${fading ? ' intro-overlay--fading' : ''}`} style={overlayStyle}>
      <FlipBoard lines={currentLines} rows={rows} columns={columns} />
    </div>
  );
}
