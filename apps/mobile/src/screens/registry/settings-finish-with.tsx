import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** "Catch with": Rolled or Hold, each drawn as the session draws it. */
export const settingsFinishWith: ScreenState = {
  id: 'settings-finish-with',
  design: null,
  undesignedReason:
    'The Care board draws this page as a list of three finish methods. Two were dropped and the two that are left are the session\u2019s two faces, so the page draws each as a small session screen.',
  component: lazy(() =>
    import('../../features/settings/captures').then((captures) => ({
      default: captures.FinishWithCapture,
    })),
  ),
  variants: standardVariants(),
};
