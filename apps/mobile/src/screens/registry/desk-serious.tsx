import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** A heavy task: no fuse, no slip, glasses off. */
export const deskSerious: ScreenState = {
  id: 'desk-serious',
  design: { board: 'Serious', section: 'One task on the desk', screen: 'Serious' },
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="serious" />,
    })),
  ),
  variants: classVariants(),
};
