import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** A period on a heavy task: plain company. */
export const sessionSerious: ScreenState = {
  id: 'session-serious',
  design: { board: 'Serious', section: 'The drum, and after', screen: 'Serious' },
  component: lazy(() =>
    import('../../features/session/session-fixture').then(({ SessionFixture }) => ({
      default: () => <SessionFixture which="serious" />,
    })),
  ),
  variants: classVariants(),
};
