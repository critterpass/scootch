import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The drawer with twelve things: six listed, the rest behind the count, and the list scrolls. */
export const drawerTwelve: ScreenState = {
  id: 'drawer-twelve',
  design: { board: 'Scootch', section: '03 Brain dump', screen: 'Peek in the drawer' },
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.DrawerTwelve,
    })),
  ),
  variants: standardVariants(),
};
