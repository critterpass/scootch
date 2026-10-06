import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The model did not answer: Scootch says so and the typed task still counts. */
export const oneScreenModelUnavailable: ScreenState = {
  id: 'one-screen-model-unavailable',
  design: {
    board: 'Care and Edge States',
    section: '02 Offline and AI unavailable',
    screen: 'AI unavailable',
  },
  component: lazy(() =>
    import('../../features/settings/captures').then((captures) => ({
      default: captures.ModelDownCapture,
    })),
  ),
  variants: standardVariants(),
};
