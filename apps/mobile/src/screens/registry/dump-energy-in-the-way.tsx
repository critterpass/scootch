import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The battery question with "Anything in the way?" under it, nothing picked. */
export const dumpEnergyInTheWay: ScreenState = {
  id: 'dump-energy-in-the-way',
  design: {
    board: 'Starting Helpers',
    section: '02 Getting in',
    screen: 'Energy step · try it',
  },
  component: lazy(() =>
    import('../../features/dump/in-the-way-captures').then((captures) => ({
      default: captures.DumpEnergyInTheWay,
    })),
  ),
  variants: standardVariants(),
};
