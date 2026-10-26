import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The drum again: "Done?". */
export const sessionTimeUp: ScreenState = {
  id: 'session-time-up',
  design: { board: 'Session', section: 'The drum, and after', screen: 'Session' },
  component: lazy(() =>
    import('../../features/session/session-fixture').then(({ SessionFixture }) => ({
      default: () => <SessionFixture which="time-up" />,
    })),
  ),
  variants: classVariants(),
};
