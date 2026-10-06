import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** "Finish with": hold, tap twice or say done, with its preview. */
export const settingsFinishWith: ScreenState = {
  id: 'settings-finish-with',
  design: {
    board: 'Care and Edge States',
    section: '03 Accessibility',
    screen: 'Finish without holding',
  },
  component: lazy(() =>
    import('../../features/settings/captures').then((captures) => ({
      default: captures.FinishWithCapture,
    })),
  ),
  variants: standardVariants(),
};
