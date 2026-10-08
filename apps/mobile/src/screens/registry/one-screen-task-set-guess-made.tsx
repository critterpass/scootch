import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A guess was made: its chip reads the guess back. */
export const oneScreenTaskSetGuessMade: ScreenState = {
  id: 'one-screen-task-set-guess-made',
  design: null,
  undesignedReason:
    'The board draws the guess read back only beside a chosen cue; this is the guess alone, on the same chip.',
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenTaskSetGuessMade,
    })),
  ),
  variants: standardVariants(),
};
