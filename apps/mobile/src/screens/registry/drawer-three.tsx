import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The drawer with three things, the second a heavy one, listed as plainly as the rest. */
export const drawerThree: ScreenState = {
  id: 'drawer-three',
  design: { board: 'Scootch', section: '03 Brain dump', screen: 'Peek in the drawer' },
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.DrawerThree,
    })),
  ),
  variants: standardVariants(),
};
