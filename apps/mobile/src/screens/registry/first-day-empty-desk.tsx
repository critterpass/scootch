import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The last beat: the empty desk and his question. */
export const firstDayEmptyDesk: ScreenState = {
  id: 'first-day-empty-desk',
  design: { board: 'EmptyDesk', section: 'First day of class', screen: 'EmptyDesk' },
  component: lazy(() =>
    import('../../features/first-day/first-day-screen').then((screen) => ({
      default: () => <screen.FirstDayScreen beat="empty desk" />,
    })),
  ),
  variants: standardVariants([]),
};
