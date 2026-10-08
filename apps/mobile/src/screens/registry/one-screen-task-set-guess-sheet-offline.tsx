import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** No connection: the guess sheet is the same sheet, and the guess is kept on the phone. */
export const oneScreenTaskSetGuessSheetOffline: ScreenState = {
  id: 'one-screen-task-set-guess-sheet-offline',
  design: null,
  undesignedReason: 'The board draws the guess sheet with a connection only; the guess needs none.',
  component: lazy(() =>
    import('../../features/one-screen/task-set-helper-captures').then((captures) => ({
      default: captures.OneScreenTaskSetGuessSheetOffline,
    })),
  ),
  variants: standardVariants(['offline']).filter((variant) => variant.condition !== undefined),
};
