import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A crisis day: every task hidden, the helplines of the region first, and no way round it. */
export const careCrisis: ScreenState = {
  id: 'care-crisis',
  design: {
    board: 'Care and Edge States',
    section: '01 Serious mode and crisis',
    screen: 'Crisis · real help first',
  },
  component: lazy(() =>
    import('../../features/care/captures').then((captures) => ({
      default: captures.CareCrisis,
    })),
  ),
  variants: standardVariants(),
};
