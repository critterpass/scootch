import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The rare circled 10, drawn with no words. */
export const sessionFinishTen: ScreenState = {
  id: 'session-finish-ten',
  design: null,
  undesignedReason:
    'The brief names the circled 10; no board draws it on the finish. Drawn in his red pen and hand.',
  component: lazy(() =>
    import('../../features/session/session-fixture').then(({ SessionFixture }) => ({
      default: () => <SessionFixture which="finish-ten" />,
    })),
  ),
  variants: classVariants(),
};
