import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The warm-up ask straight after first launch, with its three examples. */
export const launchFirstOneThing: ScreenState = {
  id: 'launch-first-one-thing',
  design: { board: 'Scootch', section: '01 First launch', screen: 'First one thing' },
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.LaunchFirstOneThing,
    })),
  ),
  variants: standardVariants(),
};
