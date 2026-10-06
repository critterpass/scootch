import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Privacy and data: plain answers, export and delete. */
export const privacyAndData: ScreenState = {
  id: 'privacy-and-data',
  design: {
    board: 'Care and Edge States',
    section: '04 Privacy and data',
    screen: 'Privacy and data',
  },
  component: lazy(() =>
    import('../../features/settings/captures').then((captures) => ({
      default: captures.PrivacyCapture,
    })),
  ),
  variants: standardVariants(),
};
