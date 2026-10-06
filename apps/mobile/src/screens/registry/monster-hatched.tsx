import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The task hatched: its monster, its name and its card text. */
export const monsterHatched: ScreenState = {
  id: 'monster-hatched',
  design: {
    board: 'Monsters and Keepsakes',
    section: '01 The task becomes a creature',
    screen: 'Hatched',
  },
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.MonsterHatched,
    })),
  ),
  variants: standardVariants(),
};
