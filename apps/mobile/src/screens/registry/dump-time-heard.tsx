import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A time was heard in the words: it is said back on the one thing, with "Good" and "Don't watch it". */
export const dumpTimeHeard: ScreenState = {
  id: 'dump-time-heard',
  design: { board: 'Starting Helpers', section: '05 A time heard', screen: 'Time heard' },
  component: lazy(() =>
    import('../../features/dump/time-heard-captures').then((captures) => ({
      default: captures.DumpTimeHeard,
    })),
  ),
  variants: standardVariants(),
};
