import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A serious thing with a time in it: the time is said back, and the plan in plain words. */
export const dumpTimeHeardSerious: ScreenState = {
  id: 'dump-time-heard-serious',
  design: null,
  undesignedReason: 'The board draws the time said back on an ordinary thing only.',
  component: lazy(() =>
    import('../../features/dump/time-heard-captures').then((captures) => ({
      default: captures.DumpTimeHeardSerious,
    })),
  ),
  variants: standardVariants(),
};
