import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** An excuse was given and Scootch counters with a smaller ask. */
export const oneScreenBargaining: ScreenState = {
  id: 'one-screen-bargaining',
  design: { board: 'Scootch', section: '02 The one screen', screen: 'Bargaining' },
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.OneScreenBargaining,
    })),
  ),
  variants: standardVariants(),
};
