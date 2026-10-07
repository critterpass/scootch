import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The one screen on a phone that can read a photo: the camera button beside the dock. */
export const cameraOpening: ScreenState = {
  id: 'camera-opening',
  design: { board: 'Camera', section: '01 Camera', screen: 'Opening the camera' },
  component: lazy(() =>
    import('../../features/camera/registry/opening-capture').then((capture) => ({
      default: capture.OneScreenWithCamera,
    })),
  ),
  variants: standardVariants(),
};
