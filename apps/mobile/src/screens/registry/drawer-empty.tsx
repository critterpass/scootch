import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The drawer with nothing parked: the title, one plain line and the way out. */
export const drawerEmpty: ScreenState = {
  id: 'drawer-empty',
  design: null,
  undesignedReason:
    'The board draws the drawer with things in it; with none, the sheet says nothing is parked and keeps its grabber, title and way out.',
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.DrawerEmpty,
    })),
  ),
  variants: standardVariants(),
};
