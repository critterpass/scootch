import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The quiet end of the day, with the world row drawn but not working yet. */
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
