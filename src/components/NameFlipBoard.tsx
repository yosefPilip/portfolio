import { useEffect, useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NAME = 'YOSEF PILIP'; // 5 (YOSEF) + 1 (space) + 5 (PILIP) = 11 cells

// ── Tune these to change the header name-board's feel ────────────────────
const STAGGER_MS = 25; // delay between each cell's flip, for the ripple effect
const FLOURISH_STEPS = 2; // how many random letters flash during the idle "shuffle"
const FLOURISH_STEP_MS = 90; // ms between each of those random letters
const IDLE_FLOURISH_MIN_MS = 4000; // shortest gap between idle shuffles
const IDLE_FLOURISH_MAX_MS = 9000; // longest gap between idle shuffles
// ───────────────────────────────────────────────────────────────────────────

interface NameFlipCellProps {
  char: string;
  inverted: boolean;
  flourishSignal: number;
  staggerMs: number;
}

function NameFlipCell({ char, inverted, flourishSignal, staggerMs }: NameFlipCellProps) {
  const [displayChar, setDisplayChar] = useState(char);
  const [flapKey, setFlapKey] = useState(0);
  const mountedInverted = useRef(false);
  const mountedFlourish = useRef(false);

  // ripple the flip when the hover/focus state changes (color swap happens via CSS)
  useEffect(() => {
    if (!mountedInverted.current) {
      mountedInverted.current = true;
      return;
    }
    const timer = window.setTimeout(() => setFlapKey((key) => key + 1), staggerMs);
    return () => window.clearTimeout(timer);
  }, [inverted, staggerMs]);

  // idle flourish: flicker through a couple random letters, then settle back on the real one
  useEffect(() => {
    if (!mountedFlourish.current) {
      mountedFlourish.current = true;
      return;
    }
    if (char === ' ') return;
    const timers: number[] = [];
    let stepsLeft = FLOURISH_STEPS;
    const runStep = () => {
      if (stepsLeft > 0) {
        setDisplayChar(GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
        setFlapKey((key) => key + 1);
        stepsLeft -= 1;
        timers.push(window.setTimeout(runStep, FLOURISH_STEP_MS));
      } else {
        setDisplayChar(char);
        setFlapKey((key) => key + 1);
      }
    };
    timers.push(window.setTimeout(runStep, staggerMs));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [flourishSignal, char, staggerMs]);

  return (
    <div className={`name-flip-cell${inverted ? ' name-flip-cell--inverted' : ''}`}>
      <div className="name-flip-cell__flap" key={flapKey}>
        <span>{displayChar === ' ' ? ' ' : displayChar}</span>
      </div>
    </div>
  );
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function NameFlipBoard() {
  const [inverted, setInverted] = useState(false);
  const [flourishSignal, setFlourishSignal] = useState(0);
  const invertedRef = useRef(inverted);

  useEffect(() => {
    invertedRef.current = inverted;
  }, [inverted]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let timer: number;
    const scheduleNext = () => {
      const delay = IDLE_FLOURISH_MIN_MS + Math.random() * (IDLE_FLOURISH_MAX_MS - IDLE_FLOURISH_MIN_MS);
      timer = window.setTimeout(() => {
        if (!invertedRef.current) setFlourishSignal((signal) => signal + 1);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <span
      className="name-flip-board"
      onMouseEnter={() => setInverted(true)}
      onMouseLeave={() => setInverted(false)}
      onFocus={() => setInverted(true)}
      onBlur={() => setInverted(false)}
      tabIndex={0}
      role="img"
      aria-label="Yosef Pilip"
    >
      {NAME.split('').map((char, index) => (
        <NameFlipCell
          key={index}
          char={char}
          inverted={inverted}
          flourishSignal={flourishSignal}
          staggerMs={index * STAGGER_MS}
        />
      ))}
    </span>
  );
}
