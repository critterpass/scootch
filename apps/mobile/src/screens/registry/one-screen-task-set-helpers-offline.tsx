import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** No connection: "Ends at" and the Guess chip are there, and no bites are offered. */
export const oneScreenTaskSetHelpersOffline: ScreenState = {
  id: 'one-screen-task-set-helpers-offline',
  design: null,
  undesignedReason:
    'The board draws the helpers with a connection only. Offline the task has no pack yet, so it has no bites; the end time and the guess are worked out on the phone.',
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenTaskSetHelpersOffline,
    })),
  ),
  variants: standardVariants(['offline']).filter((variant) => variant.condition !== undefined),
};
