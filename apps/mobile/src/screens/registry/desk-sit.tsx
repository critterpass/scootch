import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The desk the app opens on while nothing else is built: the page and "Sit." in the middle. */
export const deskSit: ScreenState = {
  id: 'desk-sit',
  design: null,
  undesignedReason: 'The plain desk the app opens on until the classroom desk is built.',
  component: lazy(() =>
    import('../../features/desk/sit-screen').then((screen) => ({ default: screen.SitScreen })),
  ),
  variants: standardVariants(),
};
