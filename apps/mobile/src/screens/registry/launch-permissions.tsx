import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The two favours, asked before the system asks; notifications is the one on show. */
export const launchPermissions: ScreenState = {
  id: 'launch-permissions',
  design: { board: 'Scootch', section: '01 First launch', screen: 'Permissions, Scootch-style' },
  component: lazy(() =>
    import('../../features/launch/captures').then((captures) => ({
      default: captures.LaunchPermissions,
    })),
  ),
  variants: standardVariants(),
};
