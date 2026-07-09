import { useMemo, type CSSProperties } from 'react';
import { FlipCell } from './FlipCell';

// ── Tune these to change the cascade of the flip-in wave ─────────────────
const STAGGER_COL_MS = 10; // extra delay per column (left → right wave speed)
const STAGGER_ROW_MS = 40; // extra delay per row (top → bottom wave speed)
const STAGGER_JITTER_MS = 60; // random per-cell jitter added on top, for a less mechanical feel
// ───────────────────────────────────────────────────────────────────────────
const BLANK = ' ';

interface FlipBoardProps {
  lines: string[];
  rows: number;
  columns: number;
}

interface CellDescriptor {
  key: string;
  targetChar: string;
  delayMs: number;
  highlight: 'lime' | 'amber';
}

function padLine(line: string, columns: number): string {
  const clipped = line.slice(0, columns).toUpperCase();
  const totalPad = columns - clipped.length;
  const left = Math.floor(totalPad / 2);
  const right = totalPad - left;
  return BLANK.repeat(left) + clipped + BLANK.repeat(right);
}

export function FlipBoard({ lines, rows, columns }: FlipBoardProps) {
  const cells = useMemo<CellDescriptor[]>(() => {
    const result: CellDescriptor[] = [];
    const topPad = Math.max(0, Math.floor((rows - lines.length) / 2));
    for (let r = 0; r < rows; r += 1) {
      const lineIndex = r - topPad;
      const rawLine = lineIndex >= 0 && lineIndex < lines.length ? lines[lineIndex] : '';
      const line = padLine(rawLine, columns);
      for (let c = 0; c < columns; c += 1) {
        result.push({
          key: `${r}-${c}`,
          targetChar: line[c] ?? BLANK,
          delayMs: c * STAGGER_COL_MS + r * STAGGER_ROW_MS + Math.random() * STAGGER_JITTER_MS,
          highlight: Math.random() < 0.5 ? 'lime' : 'amber',
        });
      }
    }
    return result;
  }, [lines, rows, columns]);

  const boardStyle = { '--flip-board-columns': columns } as CSSProperties;

  return (
    <div className="flip-board" style={boardStyle}>
      {cells.map((cell) => (
        <FlipCell key={cell.key} targetChar={cell.targetChar} delayMs={cell.delayMs} highlight={cell.highlight} />
      ))}
    </div>
  );
}
