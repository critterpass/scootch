import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The first beat: the wide, empty classroom, the class on the board, and the sheet with Take your seat. */
export const firstDayClass: ScreenState = {
  id: 'first-day-class',
  design: { board: 'FirstDay', section: 'First day of class', screen: 'FirstDay' },
  component: lazy(() =>
    import('../../features/first-day/first-day-screen').then((screen) => ({
      default: () => <screen.FirstDayScreen beat="class" />,
    })),
  ),
  variants: standardVariants([]),
};
