import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The battery question, asked before the first pick of the day. */
export const dumpEnergyRead: ScreenState = {
  id: 'dump-energy-read',
  design: { board: 'Scootch', section: '03 Brain dump', screen: 'Energy read' },
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.DumpEnergyRead,
    })),
  ),
  variants: standardVariants(),
};
