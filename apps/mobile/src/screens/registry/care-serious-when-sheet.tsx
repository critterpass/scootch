import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A serious task's When chip, opened: the same sheet as the set task's, in plain words. */
export const careSeriousWhenSheet: ScreenState = {
  id: 'care-serious-when-sheet',
  design: {
    board: 'Starting Helpers',
    section: '01 Before you start',
    screen: 'When sheet · try it',
  },
  component: lazy(() =>
    import('../../features/care/serious-when-captures').then((captures) => ({
      default: captures.CareSeriousWhenSheet,
    })),
  ),
  variants: standardVariants(),
};
