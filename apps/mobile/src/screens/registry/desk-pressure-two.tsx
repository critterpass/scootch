import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Pressure 2: arms crossed, Start breathing faster. */
export const deskPressureTwo: ScreenState = {
  id: 'desk-pressure-two',
  design: { board: 'App', section: 'One task on the desk', screen: 'App' },
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="pressure-two" />,
    })),
  ),
  variants: classVariants(),
};
