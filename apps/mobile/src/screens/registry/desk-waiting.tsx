import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The desk at pressure 1: the fuse burning, his tea over his glasses. */
export const deskWaiting: ScreenState = {
  id: 'desk-waiting',
  design: { board: 'Desk', section: 'One task on the desk', screen: 'Desk' },
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="waiting" />,
    })),
  ),
  variants: classVariants(),
};
