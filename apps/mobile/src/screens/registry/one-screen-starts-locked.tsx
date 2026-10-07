import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Home with the day's free starts used: the keyboard switch off, the talk capsule locked. */
export const oneScreenStartsLocked: ScreenState = {
  id: 'one-screen-starts-locked',
  design: null,
  undesignedReason:
    'Home keeps its composer after a finish, so the locked control of Plus is the talk capsule; no board draws it',
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenStartsLocked,
    })),
  ),
  variants: standardVariants(),
};
