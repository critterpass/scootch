import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The timetable sheet while it is locked, until tuition builds it. */
export const timetableLocked: ScreenState = {
  id: 'timetable-locked',
  design: { board: 'TimetableLocked', section: 'Around the classroom', screen: 'TimetableLocked' },
  component: lazy(() => import('../../app/timetable')),
  variants: classVariants(),
};
