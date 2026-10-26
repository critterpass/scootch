import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Five tallies: the front-row tag. */
export const deskFrontRow: ScreenState = {
  id: 'desk-front-row',
  design: { board: 'FrontRow', section: 'One task on the desk', screen: 'FrontRow' },
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="front-row" />,
    })),
  ),
  variants: classVariants(),
};
