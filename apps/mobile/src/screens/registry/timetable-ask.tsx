import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The first open: he asks to read the calendar. */
export const timetableAsk: ScreenState = {
  id: 'timetable-ask',
  design: { board: 'TimetableAsk', section: 'Around the classroom', screen: 'TimetableAsk' },
  component: lazy(() =>
    import('../../features/timetable/timetable-fixtures').then(({ TimetableFixture }) => ({
      default: () => <TimetableFixture which="ask" />,
    })),
  ),
  variants: classVariants(),
};
