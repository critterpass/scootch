import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Rewording a task, with the keyboard open. */
export const boardReword: ScreenState = {
  id: 'board-reword',
  design: null,
  undesignedReason:
    'No board draws rewording a task. The menu panel with a chalk field and the keyboard open.',
  component: lazy(() =>
    import('../../features/board/board-fixtures').then((screen) => ({
      default: screen.BoardReword,
    })),
  ),
  variants: standardVariants(),
};
