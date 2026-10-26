import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The crisis screen in Vietnam on a Wednesday afternoon: the emergency number first, open lines, then closed ones with their hours. */
export const careCrisis: ScreenState = {
  id: 'care-crisis',
  design: { board: 'Crisis', section: 'Around the classroom', screen: 'Crisis' },
  component: lazy(() =>
    import('../../features/care/crisis-screen').then((screen) => ({
      default: () => (
        <screen.CrisisScreen
          kind="crisis"
          region="VN"
          now={Date.parse('2026-10-28T07:00:00Z')}
          onClose={() => undefined}
        />
      ),
    })),
  ),
  variants: standardVariants([]),
};
