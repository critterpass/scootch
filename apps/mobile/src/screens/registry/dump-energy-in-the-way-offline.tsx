import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** No connection: the row and the reply are the phone's own. */
export const dumpEnergyInTheWayOffline: ScreenState = {
  id: 'dump-energy-in-the-way-offline',
  design: null,
  undesignedReason: 'The board draws the energy step with a connection only.',
  component: lazy(() =>
    import('../../features/dump/in-the-way-captures').then((captures) => ({
      default: captures.DumpEnergyInTheWayOffline,
    })),
  ),
  variants: standardVariants(['offline']).filter((variant) => variant.condition !== undefined),
};
