import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** First launch as a new person meets it: Scootch, his hello and one button. */
export const launchHello: ScreenState = {
  id: 'launch-hello',
  design: { board: 'Scootch', section: '01 First launch', screen: 'Hello' },
  component: lazy(() =>
    import('../../features/launch/captures').then((captures) => ({
      default: captures.LaunchHello,
    })),
  ),
  variants: standardVariants(),
};
