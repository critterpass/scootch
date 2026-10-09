import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The cue saved: the thing stays set and the one action is Start again. */
export const oneScreenTaskSetWhenSaved: ScreenState = {
  id: 'one-screen-task-set-when-saved',
  design: null,
  undesignedReason:
    'The board draws the cue before it is saved; after Save for later the dock is the plain Start, with the chip reading the cue back.',
  component: lazy(() =>
    import('../../features/one-screen/task-set-helper-captures').then((captures) => ({
      default: captures.OneScreenTaskSetWhenSaved,
    })),
  ),
  variants: standardVariants(),
};
