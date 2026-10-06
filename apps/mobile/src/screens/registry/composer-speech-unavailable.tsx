import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The phone cannot turn this language's speech into text on its own: typing only. */
export const composerSpeechUnavailable: ScreenState = {
  id: 'composer-speech-unavailable',
  design: null,
  undesignedReason:
    'The design has no screen for a phone that cannot transcribe the language by itself. Built from the typing composer and one plain line.',
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.ComposerSpeechUnavailable,
    })),
  ),
  variants: standardVariants(),
};
