import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** "Scary" picked: Scootch answers it before the battery is read. */
export const dumpEnergyInTheWayAnswered: ScreenState = {
  id: 'dump-energy-in-the-way-answered',
  design: null,
  undesignedReason:
    "The board does not draw Scootch's reply to an answer; it is his sentence above the question, as on every step.",
  component: lazy(() =>
    import('../../features/dump/in-the-way-captures').then((captures) => ({
      default: captures.DumpEnergyInTheWayAnswered,
    })),
  ),
  variants: standardVariants(),
};
