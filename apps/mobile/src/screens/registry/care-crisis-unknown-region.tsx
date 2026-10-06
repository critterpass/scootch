import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A crisis day where the region is unknown: the directory, and no number that might be wrong. */
export const careCrisisUnknownRegion: ScreenState = {
  id: 'care-crisis-unknown-region',
  design: null,
  undesignedReason:
    'The board draws the crisis screen with a helpline; a region with no row shows the directory alone.',
  component: lazy(() =>
    import('../../features/care/captures').then((captures) => ({
      default: captures.CareCrisisUnknownRegion,
    })),
  ),
  variants: standardVariants(),
};
