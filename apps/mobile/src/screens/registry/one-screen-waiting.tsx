import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The one screen as a new day meets it: Scootch waiting, his sentence and the composer. */
export const oneScreenWaiting: ScreenState = {
  id: 'one-screen-waiting',
  design: { board: 'Scootch', section: '02 The one screen', screen: 'Waiting · live composer' },
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenWaiting,
    })),
  ),
  variants: standardVariants(),
};
