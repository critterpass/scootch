import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The receipt on a phone with no store. */
export const tuitionUnavailable: ScreenState = {
  id: 'tuition-unavailable',
  design: null,
  undesignedReason: 'No board draws a phone where the store cannot be reached or is not set up',
  component: lazy(() =>
    import('../../features/tuition/tuition-fixtures').then(({ ReceiptUnavailableFixture }) => ({
      default: () => <ReceiptUnavailableFixture />,
    })),
  ),
  variants: classVariants(),
};
