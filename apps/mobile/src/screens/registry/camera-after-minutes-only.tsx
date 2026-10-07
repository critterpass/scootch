import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The card with the minutes alone. */
export const cameraAfterMinutesOnly: ScreenState = {
  id: 'camera-after-minutes-only',
  design: null,
  undesignedReason:
    'The board draws three figures. The phone shows only what it can count, and leaves out things gone when it finds no fewer.',
  component: lazy(() =>
    import('../../features/camera/registry/after-captures').then((captures) => ({
      default: captures.AfterCardMinutesOnly,
    })),
  ),
  variants: standardVariants(),
};
