import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Holding to tell him: the words as they are heard. */
export const deskListening: ScreenState = {
  id: 'desk-listening',
  design: { board: 'Listening', section: 'One task on the desk', screen: 'Listening' },
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="listening" />,
    })),
  ),
  variants: classVariants(),
};
