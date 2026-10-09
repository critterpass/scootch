import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A cue picked: both chips read back, the line under the wheel says when, Start now and Save for later. */
export const oneScreenTaskSetWhenPicked: ScreenState = {
  id: 'one-screen-task-set-when-picked',
  design: {
    board: 'Starting Helpers',
    section: '01 Before you start',
    screen: 'Task set · guess and when',
  },
  component: lazy(() =>
    import('../../features/one-screen/task-set-helper-captures').then((captures) => ({
      default: captures.OneScreenTaskSetWhenPicked,
    })),
  ),
  variants: standardVariants(),
};
