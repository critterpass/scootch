import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The board with a task long enough to wrap. */
export const boardLongText: ScreenState = {
  id: 'board-long-text',
  design: { board: 'Board', section: 'Pull and swipe', screen: 'Board' },
  component: lazy(() =>
    import('../../features/board/board-fixtures').then((screen) => ({
      default: screen.BoardLongText,
    })),
  ),
  variants: standardVariants(),
};
