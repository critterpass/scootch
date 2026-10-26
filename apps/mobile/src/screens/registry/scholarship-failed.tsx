import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The scholarship ask that did not reach the office. */
export const scholarshipFailed: ScreenState = {
  id: 'scholarship-failed',
  design: null,
  undesignedReason:
    'No board draws the scholarship ask failing (no connection, or RevenueCat not answering)',
  component: lazy(() =>
    import('../../features/tuition/tuition-fixtures').then(({ ScholarshipFixture }) => ({
      default: () => <ScholarshipFixture state="failed" />,
    })),
  ),
  variants: classVariants(),
};
