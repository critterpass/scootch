import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The crisis screen where no helpline is verified for the region: the directory alone, filled. */
export const careCrisisNoRegion: ScreenState = {
  id: 'care-crisis-no-region',
  design: null,
  undesignedReason:
    'The crisis screen where no helpline is verified for the region: the directory alone, filled.',
  component: lazy(() =>
    import('../../features/care/crisis-screen').then((screen) => ({
      default: () => (
        <screen.CrisisScreen
          kind="crisis"
          region={null}
          now={Date.parse('2026-10-28T07:00:00Z')}
          onClose={() => undefined}
        />
      ),
    })),
  ),
  variants: standardVariants([]),
};
