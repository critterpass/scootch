import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Scootch picked one from the drawer; it can be turned down. */
export const dumpPickForMe: ScreenState = {
  id: 'dump-pick-for-me',
  design: { board: 'Scootch', section: '03 Brain dump', screen: 'Pick for me' },
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.DumpPickForMe,
    })),
  ),
  variants: standardVariants(),
};
