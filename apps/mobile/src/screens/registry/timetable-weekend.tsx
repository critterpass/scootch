import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The weekend: no classes, one thing if wanted. */
export const timetableWeekend: ScreenState = {
  id: 'timetable-weekend',
  design: {
    board: 'TimetableWeekend',
    section: 'Around the classroom',
    screen: 'TimetableWeekend',
  },
  component: lazy(() =>
    import('../../features/timetable/timetable-fixtures').then(({ TimetableFixture }) => ({
      default: () => <TimetableFixture which="weekend" />,
    })),
  ),
  variants: classVariants(),
};
