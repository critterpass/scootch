import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Working beside him. */
export const sessionRunning: ScreenState = {
  id: 'session-running',
  design: { board: 'Session', section: 'The drum, and after', screen: 'Session' },
  component: lazy(() =>
    import('../../features/session/session-fixture').then(({ SessionFixture }) => ({
      default: () => <SessionFixture which="running" />,
    })),
  ),
  variants: classVariants(),
};
