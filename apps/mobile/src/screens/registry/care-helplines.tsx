import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The helplines opened from Settings: the crisis page with its own title and a way back. */
export const careHelplines: ScreenState = {
  id: 'care-helplines',
  design: null,
  undesignedReason:
    'The helplines opened from Settings: the crisis page with its own title and a way back.',
  component: lazy(() =>
    import('../../features/care/crisis-screen').then((screen) => ({
      default: () => (
        <screen.CrisisScreen
          kind="helplines"
          region="US"
          now={Date.parse('2026-10-28T07:00:00Z')}
        />
      ),
    })),
  ),
  variants: standardVariants([]),
};
