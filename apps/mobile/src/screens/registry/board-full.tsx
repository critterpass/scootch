import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The board: every task in his order, today underlined, dates and tallies, old chalk asking “Still yours?”, and the long-board remark. */
export const boardFull: ScreenState = {
  id: 'board-full',
  design: { board: 'Board', section: 'Pull and swipe', screen: 'Board' },
  component: lazy(() =>
    import('../../features/board/board-fixtures').then((screen) => ({ default: screen.BoardFull })),
  ),
  variants: standardVariants(),
};
