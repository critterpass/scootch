import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The one thing that came back, with Another and the pick. */
export const dumpOneThing: ScreenState = {
  id: 'dump-one-thing',
  design: { board: 'Scootch', section: '03 Brain dump', screen: 'The one thing' },
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.DumpOneThing,
    })),
  ),
  variants: standardVariants(),
};
