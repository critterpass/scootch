import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** "When should I bring it back?", open over the set task. */
export const oneScreenTaskSetWhenSheet: ScreenState = {
  id: 'one-screen-task-set-when-sheet',
  design: {
    board: 'Starting Helpers',
    section: '01 Before you start',
    screen: 'When sheet · try it',
  },
  component: lazy(() =>
    import('../../features/one-screen/task-set-helper-captures').then((captures) => ({
      default: captures.OneScreenTaskSetWhenSheet,
    })),
  ),
  variants: standardVariants(),
};
