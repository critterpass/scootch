import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Settings: the one page. */
export const settingsPage: ScreenState = {
  id: 'settings-page',
  design: {
    board: 'Scootch',
    section: '07 Settings and icon',
    screen: 'Settings',
  },
  component: lazy(() =>
    import('../../features/settings/captures').then((captures) => ({
      default: captures.SettingsCapture,
    })),
  ),
  variants: standardVariants(),
};
