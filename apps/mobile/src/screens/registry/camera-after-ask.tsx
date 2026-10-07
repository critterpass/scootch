import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The ask for one more photo of the same spot. */
export const cameraAfterAsk: ScreenState = {
  id: 'camera-after-ask',
  design: null,
  undesignedReason:
    'The board says Scootch asks for a second photo and draws only the card that follows; the ask is the viewfinder with his line, a shutter and a way to skip.',
  component: lazy(() =>
    import('../../features/camera/registry/after-captures').then((captures) => ({
      default: captures.AfterAsk,
    })),
  ),
  variants: standardVariants(),
};
