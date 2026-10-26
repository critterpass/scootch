import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The timetable without tuition: the quiet lock. */
export const timetableLocked: ScreenState = {
  id: 'timetable-locked',
  design: { board: 'TimetableLocked', section: 'Around the classroom', screen: 'TimetableLocked' },
  component: lazy(() =>
    import('../../features/timetable/timetable-fixtures').then(({ TimetableFixture }) => ({
      default: () => <TimetableFixture which="locked" />,
    })),
  ),
  variants: classVariants(),
};
