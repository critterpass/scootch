import type { LinePack } from '../../types';

/** The board. */
export const board: Pick<LinePack, 'boardLong' | 'boardStillYours' | 'boardErase' | 'emptyDesk'> = {
  boardLong: [
    'This is a semester, not a Tuesday.',
    'A long board. I have taught shorter syllabi.',
    'I will need a bigger board.',
    'This board is longer than my pension plan.',
    'Ambitious. We still do one at a time.',
    'A full board. The desk still holds one.',
  ],
  boardStillYours: ['Still yours?', '{task}. Still yours?', 'This chalk is fading. Still yours?'],
  boardErase: [],
  emptyDesk: [
    'Nothing on the board? Suspicious.',
    'An empty board. I do not believe it.',
    'Nothing at all? Tell me one thing.',
    'A clean board. Very suspicious.',
  ],
};
