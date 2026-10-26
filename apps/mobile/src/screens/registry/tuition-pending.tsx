import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Ask to Buy: waiting on the family organiser, nothing charged. */
export const tuitionPending: ScreenState = {
  id: 'tuition-pending',
  design: { board: 'TuitionPending', section: 'Tuition', screen: 'TuitionPending' },
  component: lazy(() =>
    import('../../features/tuition/tuition-fixtures').then(({ ReceiptFixture }) => ({
      default: () => <ReceiptFixture stage="pending" plan="monthly" />,
    })),
  ),
  variants: classVariants(),
};
