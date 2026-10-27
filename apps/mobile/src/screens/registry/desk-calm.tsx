import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Pressure 0: the task just picked, the fuse burning in the drum, Start still. */
export const deskCalm: ScreenState = {
  id: 'desk-calm',
  design: { board: 'App', section: 'One task on the desk', screen: 'App' },
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="calm" />,
    })),
  ),
  variants: classVariants(),
};
