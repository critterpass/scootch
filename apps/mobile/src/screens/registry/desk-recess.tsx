import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Recess: the camera further back, his tea at the window. */
export const deskRecess: ScreenState = {
  id: 'desk-recess',
  design: { board: 'Recess', section: 'One task on the desk', screen: 'Recess' },
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="recess" />,
    })),
  ),
  variants: classVariants(),
};
