import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** A free period booked: solid red on the dial and on its card. */
export const timetableBooked: ScreenState = {
  id: 'timetable-booked',
  design: { board: 'TimetableSheet', section: 'Pull and swipe', screen: 'TimetableSheet' },
  component: lazy(() =>
    import('../../features/timetable/timetable-fixtures').then(({ TimetableFixture }) => ({
      default: () => <TimetableFixture which="booked" />,
    })),
  ),
  variants: classVariants(),
};
