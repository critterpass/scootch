import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Settings scrolled to the timetable and the class: the period length, the drum, the language. */
export const settingsClass: ScreenState = {
  id: 'settings-class',
  design: { board: 'Settings', section: 'Around the classroom', screen: 'Settings' },
  component: lazy(() =>
    import('../../features/settings/settings-screen').then((screen) => ({
      default: () => <screen.SettingsScreen studentName="Trần Minh Anh" opensAt="class" />,
    })),
  ),
  variants: standardVariants(),
};
