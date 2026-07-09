import type { IntroVariant } from './types';

export const INTRO_VARIANTS: IntroVariant[] = [
  { screens: [['HEY THERE.', 'WELCOME ABOARD.'], ['YOSEF PILIP']] },
  { screens: [['OH, HI.', 'GLAD YOU MADE IT.'], ['YOSEF PILIP']] },
  { screens: [['WELL HELLO.', 'COME ON IN.'], ['YOSEF PILIP']] },
  { screens: [['HEY!', 'THANKS FOR STOPPING BY.'], ['YOSEF PILIP']] },
  { screens: [['SUP.', 'WELCOME TO THE SITE.'], ['YOSEF PILIP']] },
];

const BOARD_COLUMN_PADDING = 6;
const BOARD_ROW_PADDING = 4;

export const DESKTOP_COLUMNS =
  Math.max(...INTRO_VARIANTS.flatMap((variant) => variant.screens.flat()).map((line) => line.length)) +
  BOARD_COLUMN_PADDING;

export const MOBILE_COLUMNS = 14;

export function wrapLine(line: string, maxColumns: number): string[] {
  const words = line.split(' ');
  const result: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxColumns) {
      current = candidate;
      continue;
    }
    if (current) result.push(current);
    let rest = word;
    while (rest.length > maxColumns) {
      result.push(rest.slice(0, maxColumns));
      rest = rest.slice(maxColumns);
    }
    current = rest;
  }
  if (current) result.push(current);
  return result.length > 0 ? result : [''];
}

export function wrapScreenLines(lines: string[], maxColumns: number): string[] {
  return lines.flatMap((line) => wrapLine(line, maxColumns));
}

function computeRowsForColumns(columns: number): number {
  const maxWrappedLines = Math.max(
    ...INTRO_VARIANTS.flatMap((variant) =>
      variant.screens.map((screen) => wrapScreenLines(screen, columns).length),
    ),
  );
  return maxWrappedLines + BOARD_ROW_PADDING;
}

export function getBoardConfig(isMobile: boolean): { columns: number; rows: number } {
  const columns = isMobile ? MOBILE_COLUMNS : DESKTOP_COLUMNS;
  return { columns, rows: computeRowsForColumns(columns) };
}
