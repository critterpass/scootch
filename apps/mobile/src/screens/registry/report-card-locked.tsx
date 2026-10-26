import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The report card without tuition: the quiet lock. */
export const reportCardLocked: ScreenState = {
  id: 'report-card-locked',
  design: null,
  undesignedReason:
    "The brief puts a quiet lock where the report card lives; only the timetable's lock is drawn",
  component: lazy(() =>
    import('../../features/report-card/report-card-fixtures').then(({ ReportCardFixture }) => ({
      default: () => <ReportCardFixture which="locked" />,
    })),
  ),
  variants: classVariants(),
};
