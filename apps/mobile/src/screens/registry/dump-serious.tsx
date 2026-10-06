import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A serious task: plain words and the quiet choices, with no reveal and no monster. */
export const dumpSerious: ScreenState = {
  id: 'dump-serious',
  design: null,
  undesignedReason:
    'The boards draw a serious session but not the pick of a serious task; it reuses the one thing with plain words.',
  component: lazy(() =>
    import('../../features/dump/captures').then((captures) => ({
      default: captures.DumpSerious,
    })),
  ),
  variants: standardVariants(),
};
