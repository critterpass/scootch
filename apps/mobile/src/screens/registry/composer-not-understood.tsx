import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The text could not be understood: the person is asked to put it another way. */
export const composerNotUnderstood: ScreenState = {
  id: 'composer-not-understood',
  design: null,
  undesignedReason:
    'The design has no screen for text that could not be understood. Built from the waiting composer and its hint pill.',
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.ComposerNotUnderstood,
    })),
  ),
  variants: standardVariants(),
};
