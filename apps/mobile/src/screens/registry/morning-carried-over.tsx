import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The next morning with the task from yesterday, its monster a size smaller. */
export const morningCarriedOver: ScreenState = {
  id: 'morning-carried-over',
  design: {
    board: 'Scootch',
    section: '06 Not finished and coming back',
    screen: 'Next morning · carried over',
  },
  component: lazy(() =>
    import('../../features/morning/captures').then((captures) => ({
      default: captures.MorningCarriedOver,
    })),
  ),
  variants: standardVariants(),
};
