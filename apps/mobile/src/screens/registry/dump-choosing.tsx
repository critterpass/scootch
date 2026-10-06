import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The reveal on its first beat: what was said, with the one thing lit among it. */
export const dumpChoosing: ScreenState = {
  id: 'dump-choosing',
  design: { board: 'Scootch', section: '03 Brain dump', screen: 'Choosing · live' },
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.DumpChoosing,
    })),
  ),
  variants: standardVariants(),
};
