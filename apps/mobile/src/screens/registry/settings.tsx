import { lazy } from 'react';

import { useForcedVariant } from './support/forced-variant';
import { standardVariants, type ScreenState } from './support/screen-state';

/** Settings from the top: the student card, notes home and the class. */
export const settings: ScreenState = {
  id: 'settings',
  design: { board: 'Settings', section: 'Around the classroom', screen: 'Settings' },
  component: lazy(() =>
    import('../../features/settings/settings-screen').then((screen) => ({
      default: function Settings() {
        const long = useForcedVariant()?.condition === 'long-text';
        return (
          <screen.SettingsScreen
            studentName={long ? 'Nguyễn Thị Phương Thảo Ngọc Bích Hoàng Anh' : 'Trần Minh Anh'}
          />
        );
      },
    })),
  ),
  variants: standardVariants(['long-text']),
};
