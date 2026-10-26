import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Quiet hours, from the Settings row: no board draws the page behind it. */
export const settingsQuietHours: ScreenState = {
  id: 'settings-quiet-hours',
  design: null,
  undesignedReason: 'Quiet hours, from the Settings row: no board draws the page behind it.',
  component: lazy(() =>
    import('../../features/settings/quiet-hours-screen').then((screen) => ({
      default: screen.QuietHoursScreen,
    })),
  ),
  variants: standardVariants([]),
};
