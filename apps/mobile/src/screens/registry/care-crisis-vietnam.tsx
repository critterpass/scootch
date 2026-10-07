import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A crisis day in Vietnam: 115 first, then the lines that are open, then the closed ones. */
export const careCrisisVietnam: ScreenState = {
  id: 'care-crisis-vietnam',
  design: null,
  undesignedReason:
    'The board draws the crisis screen for the United States only, where one line never closes; Vietnam has lines with opening hours, so each shows its hours and a closed line says so.',
  component: lazy(() =>
    import('../../features/care/captures').then((captures) => ({
      default: captures.CareCrisisVietnam,
    })),
  ),
  variants: standardVariants(),
};
