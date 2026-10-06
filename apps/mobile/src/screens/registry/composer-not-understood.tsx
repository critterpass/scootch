import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/**
 * The text could not be understood, or the server would not take it: Scootch says nothing and the
 * person is asked, in the composer's own plain words, to put it another way.
 */
export const composerNotUnderstood: ScreenState = {
  id: 'composer-not-understood',
  design: null,
  undesignedReason:
    'The design has no screen for text that could not be understood or was rejected. Built from the waiting composer and its hint pill, with nothing spoken.',
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.ComposerNotUnderstood,
    })),
  ),
  variants: standardVariants(),
};
