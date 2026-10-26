import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The timetable: the day dial, his pick for each free period, the periods in two halves. */
export const timetableDay: ScreenState = {
  id: 'timetable-day',
  design: { board: 'TimetableSheet', section: 'Pull and swipe', screen: 'TimetableSheet' },
  component: lazy(() =>
    import('../../features/timetable/timetable-fixtures').then(({ TimetableFixture }) => ({
      default: () => <TimetableFixture which="day" />,
    })),
  ),
  variants: classVariants(),
};
