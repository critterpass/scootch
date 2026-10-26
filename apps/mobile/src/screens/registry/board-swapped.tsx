import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The board just after a task was swapped onto the desk, with his one line. */
export const boardSwapped: ScreenState = {
  id: 'board-swapped',
  design: null,
  undesignedReason:
    'No board draws his swap line on the board. His one line takes the remark’s place at the foot.',
  component: lazy(() =>
    import('../../features/board/board-fixtures').then((screen) => ({
      default: screen.BoardSwapped,
    })),
  ),
  variants: standardVariants(),
};
