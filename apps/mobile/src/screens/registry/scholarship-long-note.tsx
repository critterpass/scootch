import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The scholarship with a long note typed. */
export const scholarshipLongNote: ScreenState = {
  id: 'scholarship-long-note',
  design: { board: 'Scholarship', section: 'Tuition', screen: 'Scholarship' },
  component: lazy(() =>
    import('../../features/tuition/tuition-fixtures').then(({ ScholarshipFixture }) => ({
      default: () => (
        <ScholarshipFixture
          state="asking"
          note="Rent went up, the bike broke and payday is three weeks away. I would rather keep coming to class than pay for it this month."
        />
      ),
    })),
  ),
  variants: classVariants(),
};
