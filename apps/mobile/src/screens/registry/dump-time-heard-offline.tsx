import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** No connection: the time said back and the plan are the phone's own. */
export const dumpTimeHeardOffline: ScreenState = {
  id: 'dump-time-heard-offline',
  design: null,
  undesignedReason: 'The board draws the time said back with a connection only.',
  component: lazy(() =>
    import('../../features/dump/time-heard-captures').then((captures) => ({
      default: captures.DumpTimeHeardOffline,
    })),
  ),
  variants: standardVariants(['offline']).filter((variant) => variant.condition !== undefined),
};
