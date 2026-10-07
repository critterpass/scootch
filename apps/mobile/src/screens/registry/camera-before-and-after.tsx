import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The two photos under one handle, with what the phone can count about them. */
export const cameraBeforeAndAfter: ScreenState = {
  id: 'camera-before-and-after',
  design: { board: 'Camera', section: '01 Camera', screen: 'Before and after' },

  component: lazy(() =>
    import('../../features/camera/registry/after-captures').then((captures) => ({
      default: captures.AfterCard,
    })),
  ),
  variants: standardVariants(),
};
