import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The card after it was saved. */
export const cameraAfterKept: ScreenState = {
  id: 'camera-after-kept',
  design: null,
  undesignedReason:
    'The board draws no answer to Keep private; one plain line says the card is in the person’s own photos.',
  component: lazy(() =>
    import('../../features/camera/registry/after-captures').then((captures) => ({
      default: captures.AfterCardKept,
    })),
  ),
  variants: standardVariants(),
};
