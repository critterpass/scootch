import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A task’s menu: onto the desk, reword, tick off, erase. */
export const boardMenu: ScreenState = {
  id: 'board-menu',
  design: null,
  undesignedReason:
    'No board draws the tap and long-press way to a row’s actions. A chalk-green panel of the board’s own pills.',
  component: lazy(() =>
    import('../../features/board/board-fixtures').then((screen) => ({ default: screen.BoardMenu })),
  ),
  variants: standardVariants(),
};
