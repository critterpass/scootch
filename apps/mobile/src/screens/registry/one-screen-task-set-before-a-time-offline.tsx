import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** No connection: the capped length and its line are worked out on the phone. */
export const oneScreenTaskSetBeforeATimeOffline: ScreenState = {
  id: 'one-screen-task-set-before-a-time-offline',
  design: null,
  undesignedReason: 'The board draws the capped length with a connection only.',
  component: lazy(() =>
    import('../../features/dump/time-heard-captures').then((captures) => ({
      default: captures.OneScreenTaskSetBeforeATimeOffline,
    })),
  ),
  variants: standardVariants(['offline']).filter((variant) => variant.condition !== undefined),
};
