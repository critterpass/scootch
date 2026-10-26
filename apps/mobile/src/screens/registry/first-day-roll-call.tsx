import { lazy } from 'react';

import { useForcedVariant } from './support/forced-variant';
import { standardVariants, type ScreenState } from './support/screen-state';

/** Roll call: the full name, answered with Present. */
export const firstDayRollCall: ScreenState = {
  id: 'first-day-roll-call',
  design: { board: 'RollCall', section: 'First day of class', screen: 'RollCall' },
  component: lazy(() =>
    import('../../features/first-day/first-day-screen').then((screen) => ({
      default: function RollCall() {
        const long = useForcedVariant()?.condition === 'long-text';
        return (
          <screen.FirstDayScreen
            beat="roll call"
            typedName={long ? 'Nguyễn Thị Phương Thảo Ngọc Bích Hoàng Anh' : 'Trần Minh Anh'}
          />
        );
      },
    })),
  ),
  variants: standardVariants(['keyboard-open', 'long-text']),
};
