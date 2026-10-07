import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Home on a day with something done in it: Scootch asleep, the world card and the composer. */
export const oneScreenDoneForToday: ScreenState = {
  id: 'one-screen-done-for-today',
  design: { board: 'Scootch', section: '02 The one screen', screen: 'Done for today' },
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenDoneForToday,
    })),
  ),
  variants: standardVariants(),
};
