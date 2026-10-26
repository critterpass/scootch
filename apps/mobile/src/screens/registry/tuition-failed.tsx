import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The payment did not go through: nothing charged, try again. */
export const tuitionFailed: ScreenState = {
  id: 'tuition-failed',
  design: { board: 'TuitionFailed', section: 'Tuition', screen: 'TuitionFailed' },
  component: lazy(() =>
    import('../../features/tuition/tuition-fixtures').then(({ ReceiptFixture }) => ({
      default: () => <ReceiptFixture stage="failed" />,
    })),
  ),
  variants: classVariants(),
};
