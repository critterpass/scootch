import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Paid: the red PAID stamp, his note before the renewal. */
export const tuitionPaid: ScreenState = {
  id: 'tuition-paid',
  design: { board: 'TuitionPaid', section: 'Tuition', screen: 'TuitionPaid' },
  component: lazy(() =>
    import('../../features/tuition/tuition-fixtures').then(({ ReceiptFixture }) => ({
      default: () => <ReceiptFixture stage="paid" />,
    })),
  ),
  variants: classVariants(),
};
