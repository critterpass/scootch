import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Holding with no connection: the bar says so, typing a tap away. */
export const deskNoConnection: ScreenState = {
  id: 'desk-no-connection',
  design: null,
  undesignedReason:
    'No board draws hearing failing. One muted line under the composer, the keyboard key beside it.',
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="no-connection" />,
    })),
  ),
  variants: classVariants(),
};
