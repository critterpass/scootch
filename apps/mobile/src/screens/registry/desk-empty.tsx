import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Nothing on the board. */
export const deskEmpty: ScreenState = {
  id: 'desk-empty',
  design: { board: 'EmptyDesk', section: 'First day of class', screen: 'EmptyDesk' },
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="empty" />,
    })),
  ),
  variants: classVariants(['empty']),
};
