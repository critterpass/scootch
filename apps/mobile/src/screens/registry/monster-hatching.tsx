import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The hatch while the words of the monster are still on their way. */
export const monsterHatching: ScreenState = {
  id: 'monster-hatching',
  design: null,
  undesignedReason:
    'The boards draw the hatch with its name already there; this is the wait before the name arrives.',
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.MonsterHatching,
    })),
  ),
  variants: standardVariants(),
};
