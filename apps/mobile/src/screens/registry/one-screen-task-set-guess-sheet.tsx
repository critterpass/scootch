import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** "How long would this take?": five steps, the guess said back on the button, and Skip. */
export const oneScreenTaskSetGuessSheet: ScreenState = {
  id: 'one-screen-task-set-guess-sheet',
  design: {
    board: 'Starting Helpers',
    section: '01 Before you start',
    screen: 'Guess sheet',
  },
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenTaskSetGuessSheet,
    })),
  ),
  variants: standardVariants(),
};
