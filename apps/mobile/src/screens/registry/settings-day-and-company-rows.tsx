import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Settings: the rows for the day moments, the lead before a time heard, and the switch for others hunting. */
export const settingsDayAndCompanyRows: ScreenState = {
  id: 'settings-day-and-company-rows',
  design: null,
  undesignedReason:
    'The helpers board promises these settings in its decisions and draws none of them; built from the Settings rows and the quiet hours sheet.',
  component: lazy(() =>
    import('../../features/settings/captures').then((captures) => ({
      default: captures.DayAndCompanyRowsCapture,
    })),
  ),
  variants: standardVariants(),
};
