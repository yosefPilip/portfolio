import { useEffect, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SCRAMBLE_STEPS = 6;
const SCRAMBLE_STEP_MS = 160;
const NBSP = String.fromCharCode(160);
const BLANK = ' ';

interface FlipCellProps {
  targetChar: string;
  delayMs: number;
  highlight: 'lime' | 'amber';
}

export function FlipCell({ targetChar, delayMs, highlight }: FlipCellProps) {
  const [displayChar, setDisplayChar] = useState(BLANK);
  const [flipping, setFlipping] = useState(false);
  const [flapKey, setFlapKey] = useState(0);

  useEffect(() => {
    setDisplayChar(BLANK);
    let stepsLeft = SCRAMBLE_STEPS;
    let stepTimer: number | undefined;

    const startTimer = window.setTimeout(() => {
      setFlipping(targetChar !== BLANK);
      const runStep = () => {
        if (stepsLeft > 0) {
          setDisplayChar(targetChar === BLANK ? BLANK : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
          setFlapKey((key) => key + 1);
          stepsLeft -= 1;
          stepTimer = window.setTimeout(runStep, SCRAMBLE_STEP_MS);
        } else {
          setDisplayChar(targetChar);
          setFlapKey((key) => key + 1);
          setFlipping(false);
        }
      };
      runStep();
    }, delayMs);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(stepTimer);
    };
  }, [targetChar, delayMs]);

  const glyph = displayChar === BLANK ? NBSP : displayChar;

  return (
    <div className={`flip-cell${flipping ? ` flip-cell--active flip-cell--${highlight}` : ''}`}>
      <div className="flip-cell__flap" key={flapKey}>
        <span>{glyph}</span>
      </div>
    </div>
  );
}
