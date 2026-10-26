import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The late slip, an excuse picked and graded in red. */
export const deskLateSlip: ScreenState = {
  id: 'desk-late-slip',
  design: { board: 'LateSlip', section: 'One task on the desk', screen: 'LateSlip' },
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="late-slip" />,
    })),
  ),
  variants: classVariants(),
};
