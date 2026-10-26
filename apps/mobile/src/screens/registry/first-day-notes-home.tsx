import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Notes home: his ask, one real example, Not now beside Allow. */
export const firstDayNotesHome: ScreenState = {
  id: 'first-day-notes-home',
  design: { board: 'NotesHome', section: 'First day of class', screen: 'NotesHome' },
  component: lazy(() =>
    import('../../features/first-day/first-day-screen').then((screen) => ({
      default: () => <screen.FirstDayScreen beat="notes home" />,
    })),
  ),
  variants: standardVariants([]),
};
