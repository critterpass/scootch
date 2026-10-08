import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The hatch of an odd week: the same task, out of its egg as three tiny monsters. */
export const oddHatchTiny: ScreenState = {
  id: 'odd-hatch-tiny',
  design: {
    board: 'Starting Helpers',
    section: '07 Odd week',
    screen: 'Hatch · tiny',
  },
  component: lazy(() =>
    import('../../features/monster/tiny-hatch-capture').then((capture) => ({
      default: capture.TinyHatchCapture,
    })),
  ),
  variants: standardVariants(),
};
