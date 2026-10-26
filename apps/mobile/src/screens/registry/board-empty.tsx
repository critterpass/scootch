import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The board with nothing on it. */
export const boardEmpty: ScreenState = {
  id: 'board-empty',
  design: null,
  undesignedReason:
    'No board draws the empty board. The board with no rows, his empty-board line and a quiet hint to tell him something at the desk.',
  component: lazy(() =>
    import('../../features/board/board-fixtures').then((screen) => ({
      default: screen.BoardEmpty,
    })),
  ),
  variants: standardVariants(),
};
