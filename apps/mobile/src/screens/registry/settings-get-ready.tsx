import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The sheet of the lead before a time heard, five minutes at a time. */
export const settingsGetReady: ScreenState = {
  id: 'settings-get-ready',
  design: null,
  undesignedReason:
    'The helpers board promises these settings in its decisions and draws none of them; built from the Settings rows and the quiet hours sheet.',
  component: lazy(() =>
    import('../../features/settings/captures').then((captures) => ({
      default: captures.GetReadyCapture,
    })),
  ),
  variants: standardVariants(),
};
