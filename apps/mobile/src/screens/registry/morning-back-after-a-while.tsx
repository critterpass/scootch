import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Back after a week or more: the smallest ask and three small ways in. */
export const morningBackAfterAWhile: ScreenState = {
  id: 'morning-back-after-a-while',
  design: {
    board: 'Scootch',
    section: '06 Not finished and coming back',
    screen: 'Back after a while',
  },
  component: lazy(() =>
    import('../../features/morning/captures').then((captures) => ({
      default: captures.MorningReturn,
    })),
  ),
  variants: standardVariants(),
};
