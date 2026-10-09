import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** "Too big" picked: the reply points at the bites. */
export const dumpEnergyInTheWayTooBig: ScreenState = {
  id: 'dump-energy-in-the-way-too-big',
  design: null,
  undesignedReason: "The board does not draw Scootch's reply to an answer.",
  component: lazy(() =>
    import('../../features/dump/in-the-way-captures').then((captures) => ({
      default: captures.DumpEnergyInTheWayTooBig,
    })),
  ),
  variants: standardVariants(),
};
