import { useEffect, useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ── Tune these to change how each cell animates ──────────────────────────
const SCRAMBLE_STEPS = 4; // how many random letters flash before landing on the target character (flip IN)
const SCRAMBLE_STEP_MS = 90; // ms between each of those random letters (flip IN speed)
const OUTRO_STEPS = 3; // how many random letters flash before landing on blank (flip OUT)
const OUTRO_STEP_MS = 90; // ms between each of those random letters (flip OUT speed)
// ───────────────────────────────────────────────────────────────────────────

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
  const hasMounted = useRef(false);
  const prevTargetRef = useRef(BLANK);

  useEffect(() => {
    const timers: number[] = [];
    const schedule = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    const runIntro = () => {
      schedule(() => {
        setFlipping(targetChar !== BLANK);
        let stepsLeft = SCRAMBLE_STEPS;
        const runStep = () => {
          if (stepsLeft > 0) {
            setDisplayChar(targetChar === BLANK ? BLANK : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
            setFlapKey((key) => key + 1);
            stepsLeft -= 1;
            schedule(runStep, SCRAMBLE_STEP_MS);
          } else {
            setDisplayChar(targetChar);
            setFlapKey((key) => key + 1);
            setFlipping(false);
          }
        };
        runStep();
      }, delayMs);
    };

    const runOutro = (onDone: () => void) => {
      setFlipping(true);
      let stepsLeft = OUTRO_STEPS;
      const runStep = () => {
        if (stepsLeft > 0) {
          setDisplayChar(GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
          setFlapKey((key) => key + 1);
          stepsLeft -= 1;
          schedule(runStep, OUTRO_STEP_MS);
        } else {
          setDisplayChar(BLANK);
          setFlapKey((key) => key + 1);
          setFlipping(false);
          onDone();
        }
      };
      runStep();
    };

    const prevTarget = prevTargetRef.current;
    prevTargetRef.current = targetChar;

    if (!hasMounted.current) {
      hasMounted.current = true;
      setDisplayChar(BLANK);
      setFlapKey((key) => key + 1);
      runIntro();
    } else if (prevTarget === BLANK && targetChar === BLANK) {
      // nothing was showing and nothing will show, so there's nothing to flip
      runIntro();
    } else {
      // flip the current character out through a couple random letters before it lands on blank,
      // then flip the new one in
      runOutro(runIntro);
    }

    return () => timers.forEach((id) => window.clearTimeout(id));
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
