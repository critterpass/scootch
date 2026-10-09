import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** "Just this, today" with a cue kept: the When chip reads it back over the quiet choices. */
export const careSeriousWhenKept: ScreenState = {
  id: 'care-serious-when-kept',
  design: {
    board: 'Care and Edge States',
    section: '01 Serious mode and crisis',
    screen: 'Serious mode · something heavy',
  },
  component: lazy(() =>
    import('../../features/care/serious-when-captures').then((captures) => ({
      default: captures.CareSeriousWhenKept,
    })),
  ),
  variants: standardVariants(),
};
