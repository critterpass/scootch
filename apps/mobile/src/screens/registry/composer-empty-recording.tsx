import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A recording with nothing in it: nothing is sent and the hint says so. */
export const composerEmptyRecording: ScreenState = {
  id: 'composer-empty-recording',
  design: null,
  undesignedReason:
    'The design has no screen for a silent recording. Built from the waiting composer and its hint pill.',
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.ComposerEmptyRecording,
    })),
  ),
  variants: standardVariants(),
};
