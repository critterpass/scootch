import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** "Just this, today" with a time in its words: the time said back in plain words, and its answers. */
export const careSeriousTimeHeard: ScreenState = {
  id: 'care-serious-time-heard',
  design: null,
  undesignedReason:
    'The board draws the time said back on an ordinary thing, and no helpers on the serious screen.',
  component: lazy(() =>
    import('../../features/care/serious-time-heard-captures').then((captures) => ({
      default: captures.CareSeriousTimeHeard,
    })),
  ),
  variants: standardVariants(),
};
