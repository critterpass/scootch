import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The animated splash, held at the moment the card is written and he has risen behind it. */
export const splash: ScreenState = {
  id: 'splash',
  design: { board: 'Splash', section: 'First day of class', screen: 'Splash' },
  component: lazy(() =>
    import('../../features/first-day/splash').then((screen) => ({
      default: () => <screen.Splash quick={false} held />,
    })),
  ),
  variants: standardVariants([]),
};
