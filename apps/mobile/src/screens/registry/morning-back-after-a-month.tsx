import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Back after a month: the same small ask, with nothing that mentions the time away. */
export const morningBackAfterAMonth: ScreenState = {
  id: 'morning-back-after-a-month',
  design: {
    board: 'Scootch',
    section: '06 Not finished and coming back',
    screen: 'Back after a month',
  },
  component: lazy(() =>
    import('../../features/morning/captures').then((captures) => ({
      default: captures.MorningReturn,
    })),
  ),
  variants: standardVariants(),
};
