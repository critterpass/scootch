import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Home once the world card has been swiped away: Scootch, his line and the composer. */
export const oneScreenWorldCardAway: ScreenState = {
  id: 'one-screen-world-card-away',
  design: null,
  undesignedReason:
    'The board always draws the world card on home. It can be swiped away and stays away, so home is also drawn without it.',
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenWorldCardAway,
    })),
  ),
  variants: standardVariants(),
};
