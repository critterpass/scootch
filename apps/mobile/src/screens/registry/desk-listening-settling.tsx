import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Let go: he is reading it while the last words settle. */
export const deskListeningSettling: ScreenState = {
  id: 'desk-listening-settling',
  design: null,
  undesignedReason:
    'No board draws the moment after letting go, while the last phrase settles. The listening panel with the thinking line, the bars and hint gone.',
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="settling" />,
    })),
  ),
  variants: classVariants(),
};
