import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The free week started: the blue FREE WEEK stamp and the day of the charge. */
export const tuitionTrial: ScreenState = {
  id: 'tuition-trial',
  design: { board: 'TuitionTrial', section: 'Tuition', screen: 'TuitionTrial' },
  component: lazy(() =>
    import('../../features/tuition/tuition-fixtures').then(({ ReceiptFixture }) => ({
      default: () => <ReceiptFixture stage="trial" />,
    })),
  ),
  variants: classVariants(),
};
