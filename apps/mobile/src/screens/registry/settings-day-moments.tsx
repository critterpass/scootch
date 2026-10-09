import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The sheet of the five day moments, each moved ten minutes at a time. */
export const settingsDayMoments: ScreenState = {
  id: 'settings-day-moments',
  design: null,
  undesignedReason:
    'The helpers board promises these settings in its decisions and draws none of them; built from the Settings rows and the quiet hours sheet.',
  component: lazy(() =>
    import('../../features/settings/captures').then((captures) => ({
      default: captures.DayMomentsCapture,
    })),
  ),
  variants: standardVariants(),
};
