import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The receipt for a student on a scholarship. */
export const tuitionOnScholarship: ScreenState = {
  id: 'tuition-on-scholarship',
  design: null,
  undesignedReason: 'No board draws the receipt opened by someone holding a scholarship',
  component: lazy(() =>
    import('../../features/tuition/tuition-fixtures').then(({ ReceiptFixture }) => ({
      default: () => <ReceiptFixture stage="scholarship" />,
    })),
  ),
  variants: classVariants(),
};
