import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** "Still yours?" about a task untouched for three weeks. */
export const deskStillYours: ScreenState = {
  id: 'desk-still-yours',
  design: null,
  undesignedReason:
    'No board draws it; built from the desk sheet and the glass of the offline pill.',
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="still-yours" />,
    })),
  ),
  variants: classVariants(),
};
