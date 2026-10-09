import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** No connection, a cue picked: the cue and its message are the phone's own. */
export const oneScreenTaskSetWhenPickedOffline: ScreenState = {
  id: 'one-screen-task-set-when-picked-offline',
  design: null,
  undesignedReason: 'The board draws the cue with a connection only; the cue needs none.',
  component: lazy(() =>
    import('../../features/one-screen/task-set-helper-captures').then((captures) => ({
      default: captures.OneScreenTaskSetWhenPickedOffline,
    })),
  ),
  variants: standardVariants(['offline']).filter((variant) => variant.condition !== undefined),
};
