import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The drawer, opened by a deliberate pull: what is parked, with dates and a swap. */
export const dumpPeekInTheDrawer: ScreenState = {
  id: 'dump-peek-in-the-drawer',
  design: { board: 'Scootch', section: '03 Brain dump', screen: 'Peek in the drawer' },
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.DrawerPeek,
    })),
  ),
  variants: standardVariants(),
};
