import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** No connection, and the When sheet open. */
export const oneScreenTaskSetWhenSheetOffline: ScreenState = {
  id: 'one-screen-task-set-when-sheet-offline',
  design: null,
  undesignedReason: 'The board draws the When sheet with a connection only; it needs none.',
  component: lazy(() =>
    import('../../features/one-screen/task-set-helper-captures').then((captures) => ({
      default: captures.OneScreenTaskSetWhenSheetOffline,
    })),
  ),
  variants: standardVariants(['offline']).filter((variant) => variant.condition !== undefined),
};
