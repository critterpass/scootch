import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Granted: the certificate with his APPROVED stamp. */
export const scholarshipGranted: ScreenState = {
  id: 'scholarship-granted',
  design: { board: 'ScholarshipGranted', section: 'Tuition', screen: 'ScholarshipGranted' },
  component: lazy(() =>
    import('../../features/tuition/tuition-fixtures').then(({ ScholarshipFixture }) => ({
      default: () => <ScholarshipFixture state="granted" />,
    })),
  ),
  variants: classVariants(),
};
