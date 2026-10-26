import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The report card with task names under white-out. */
export const reportCardHidden: ScreenState = {
  id: 'report-card-hidden',
  design: { board: 'ReportCard', section: 'Around the classroom', screen: 'ReportCard' },
  component: lazy(() =>
    import('../../features/report-card/report-card-fixtures').then(({ ReportCardFixture }) => ({
      default: () => <ReportCardFixture which="hidden" />,
    })),
  ),
  variants: classVariants(),
};
