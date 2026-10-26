import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** "Can't pay right now?": one tap and an optional note. */
export const scholarship: ScreenState = {
  id: 'scholarship',
  design: { board: 'Scholarship', section: 'Tuition', screen: 'Scholarship' },
  component: lazy(() =>
    import('../../features/tuition/tuition-fixtures').then(({ ScholarshipFixture }) => ({
      default: () => <ScholarshipFixture state="asking" />,
    })),
  ),
  variants: classVariants(),
};
