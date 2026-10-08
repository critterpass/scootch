import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The bites on request: three rows with their minutes and ticks, one down, and the note under them. */
export const oneScreenTaskSetBitesSheet: ScreenState = {
  id: 'one-screen-task-set-bites-sheet',
  design: {
    board: 'Starting Helpers',
    section: '02 Getting in',
    screen: 'Bites sheet · try it',
  },
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenTaskSetBitesSheet,
    })),
  ),
  variants: standardVariants(),
};
