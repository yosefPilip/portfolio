import { useMemo, type CSSProperties } from 'react';
import { FlipCell } from './FlipCell';

const STAGGER_COL_MS = 15;
const STAGGER_ROW_MS = 40;
const STAGGER_JITTER_MS = 80;
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
    for (let r = 0; r < rows; r += 1) {
      const line = padLine(lines[r] ?? '', columns);
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
