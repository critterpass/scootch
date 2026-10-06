import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The microphone was refused: typing only. */
export const composerMicrophoneRefused: ScreenState = {
  id: 'composer-microphone-refused',
  design: null,
  undesignedReason:
    'The design names this state (typing only) without drawing it. Built from the typing composer and one plain line with the way to Settings.',
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.ComposerMicrophoneRefused,
    })),
  ),
  variants: standardVariants(),
};
