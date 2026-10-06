import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The second step of deleting everything: the safe button is the big one. */
export const privacyDeleteEverything: ScreenState = {
  id: 'privacy-delete-everything',
  design: {
    board: 'Care and Edge States',
    section: '04 Privacy and data',
    screen: 'Delete everything',
  },
  component: lazy(() =>
    import('../../features/settings/captures').then((captures) => ({
      default: captures.PrivacyDeleteCapture,
    })),
  ),
  variants: standardVariants(),
};
