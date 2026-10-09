import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A watched time ahead today: the wheel opens at a length that ends before getting ready. */
export const oneScreenTaskSetBeforeATime: ScreenState = {
  id: 'one-screen-task-set-before-a-time',
  design: {
    board: 'Starting Helpers',
    section: '05 A time heard',
    screen: 'Task set · ends before',
  },
  component: lazy(() =>
    import('../../features/dump/time-heard-captures').then((captures) => ({
      default: captures.OneScreenTaskSetBeforeATime,
    })),
  ),
  variants: standardVariants(),
};
