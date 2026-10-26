import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** No connection: the pill, and he still hears you. */
export const deskOffline: ScreenState = {
  id: 'desk-offline',
  design: { board: 'OfflineDesk', section: 'One task on the desk', screen: 'OfflineDesk' },
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="offline" />,
    })),
  ),
  variants: classVariants(['offline']),
};
