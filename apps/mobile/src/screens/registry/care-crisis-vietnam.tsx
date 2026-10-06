import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A crisis day in Vietnam: the emergency number and the directory, until a helpline is verified. */
export const careCrisisVietnam: ScreenState = {
  id: 'care-crisis-vietnam',
  design: null,
  undesignedReason:
    'The board draws the crisis screen for the United States only; Vietnam has no verified helpline yet, so it shows the emergency number and the directory.',
  component: lazy(() =>
    import('../../features/care/captures').then((captures) => ({
      default: captures.CareCrisisVietnam,
    })),
  ),
  variants: standardVariants(),
};
