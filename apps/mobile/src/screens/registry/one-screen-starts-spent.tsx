import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Home with every start of the day used and nothing to offer: on Plus, and on a heavy day. */
export const oneScreenStartsSpent: ScreenState = {
  id: 'one-screen-starts-spent',
  design: null,
  undesignedReason:
    'Home keeps its composer after a finish, so a day with no start left draws it spent; no board draws it',
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenStartsSpent,
    })),
  ),
  variants: standardVariants(),
};
