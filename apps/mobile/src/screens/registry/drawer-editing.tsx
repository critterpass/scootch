import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The drawer with one parked thing's words open for rewording, the keyboard up under the sheet. */
export const drawerEditing: ScreenState = {
  id: 'drawer-editing',
  design: null,
  undesignedReason:
    'The board draws the drawer as a list to read; rewording a parked thing in place has no board',
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.DrawerEditing,
    })),
  ),
  variants: standardVariants(['keyboard-open']),
};
