import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Writing it down, with the keyboard open. */
export const deskTyping: ScreenState = {
  id: 'desk-typing',
  design: { board: 'Typing', section: 'One task on the desk', screen: 'Typing' },
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="typing" />,
    })),
  ),
  variants: classVariants(['keyboard-open']),
};
