import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The set task with its quiet helpers: "Ends at" under the wheel, the Guess chip and the bites. */
export const oneScreenTaskSetEndsAt: ScreenState = {
  id: 'one-screen-task-set-ends-at',
  design: {
    board: 'Starting Helpers',
    section: '01 Before you start',
    screen: 'Task set · ends at',
  },
  component: lazy(() =>
    import('../../features/one-screen/task-set-helper-captures').then((captures) => ({
      default: captures.OneScreenTaskSetEndsAt,
    })),
  ),
  variants: standardVariants(),
};
