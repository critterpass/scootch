import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Pressure 5: silence and the white glare. */
export const deskGlare: ScreenState = {
  id: 'desk-glare',
  design: { board: 'DeskHot', section: 'One task on the desk', screen: 'DeskHot' },
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="glare" />,
    })),
  ),
  variants: classVariants(),
};
