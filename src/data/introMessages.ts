import type { IntroVariant } from './types';

export const INTRO_VARIANTS: IntroVariant[] = [
  { screens: [['HEY THERE.', 'WELCOME ABOARD.'], ['YOSEF PILIP']] },
  { screens: [['OH, HI.', 'GLAD YOU MADE IT.'], ['YOSEF PILIP']] },
  { screens: [['WELL HELLO.', 'COME ON IN.'], ['YOSEF PILIP']] },
  { screens: [['HEY!', 'THANKS FOR STOPPING BY.'], ['YOSEF PILIP']] },
  { screens: [['SUP.', 'WELCOME TO THE SITE.'], ['YOSEF PILIP']] },
];

export const BOARD_ROWS = 6;

const BOARD_COLUMN_PADDING = 6;

export const BOARD_COLUMNS =
  Math.max(...INTRO_VARIANTS.flatMap((variant) => variant.screens.flat()).map((line) => line.length)) +
  BOARD_COLUMN_PADDING;
