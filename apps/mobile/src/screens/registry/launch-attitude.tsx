import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The one setup choice, with Cheeky chosen as it is before anyone picks. */
export const launchAttitude: ScreenState = {
  id: 'launch-attitude',
  design: { board: 'Scootch', section: '01 First launch', screen: 'Pick my attitude' },
  component: lazy(() =>
    import('../../features/launch/captures').then((captures) => ({
      default: captures.LaunchAttitude,
    })),
  ),
  variants: standardVariants(),
};
