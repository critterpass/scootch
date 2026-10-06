import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** "Just sit with me" on a crisis day: the one sentence changes and the helplines stay. */
export const careCrisisSitting: ScreenState = {
  id: 'care-crisis-sitting',
  design: null,
  undesignedReason:
    'The board draws the button but not what follows it; the sentence changes, nothing is asked and help stays on the screen.',
  component: lazy(() =>
    import('../../features/care/captures').then((captures) => ({
      default: captures.CareCrisisSitting,
    })),
  ),
  variants: standardVariants(),
};
