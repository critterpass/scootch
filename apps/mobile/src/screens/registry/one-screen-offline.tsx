import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** No connection: the typed text is the task as it is, in plain company, and it still starts. */
export const oneScreenOffline: ScreenState = {
  id: 'one-screen-offline',
  design: {
    board: 'Care and Edge States',
    section: '02 Offline and AI unavailable',
    screen: 'Offline · still starts',
  },
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenOffline,
    })),
  ),
  variants: standardVariants(['offline']).filter((variant) => variant.condition !== undefined),
};
