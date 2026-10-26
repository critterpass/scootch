import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The report card for the term. */
export const reportCard: ScreenState = {
  id: 'report-card',
  design: { board: 'ReportCard', section: 'Around the classroom', screen: 'ReportCard' },
  component: lazy(() =>
    import('../../features/report-card/report-card-fixtures').then(({ ReportCardFixture }) => ({
      default: () => <ReportCardFixture which="term" />,
    })),
  ),
  variants: classVariants(),
};
