import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Held: the capsule is tomato, with the waveform, the time and the words heard so far. */
export const oneScreenListening: ScreenState = {
  id: 'one-screen-listening',
  design: { board: 'Scootch', section: '02 The one screen', screen: 'Listening' },
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenListening,
    })),
  ),
  variants: standardVariants(),
};
