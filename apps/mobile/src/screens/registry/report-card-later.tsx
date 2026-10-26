import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** A term not yet begun: nothing to read. */
export const reportCardLater: ScreenState = {
  id: 'report-card-later',
  design: { board: 'ReportCard', section: 'Around the classroom', screen: 'ReportCard' },
  component: lazy(() =>
    import('../../features/report-card/report-card-fixtures').then(({ ReportCardFixture }) => ({
      default: () => <ReportCardFixture which="later" />,
    })),
  ),
  variants: classVariants(),
};
