import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** "Too big" was said: the task and its monster are both smaller. */
export const monsterShrunk: ScreenState = {
  id: 'monster-shrunk',
  design: {
    board: 'Monsters and Keepsakes',
    section: '01 The task becomes a creature',
    screen: 'Shrunk',
  },
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.MonsterShrunk,
    })),
  ),
  variants: standardVariants(),
};
