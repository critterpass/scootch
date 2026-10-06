import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A real date was heard: it is said before anything parked is seen. */
export const dumpDeadlineHeard: ScreenState = {
  id: 'dump-deadline-heard',
  design: { board: 'Scootch', section: '03 Brain dump', screen: 'Deadline heard' },
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.DumpDeadlineHeard,
    })),
  ),
  variants: standardVariants(),
};
