import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Pressure 4: his full name, and the chalk thrown. */
export const deskHot: ScreenState = {
  id: 'desk-hot',
  design: { board: 'DeskHot', section: 'One task on the desk', screen: 'DeskHot' },
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="hot" />,
    })),
  ),
  variants: classVariants(),
};
