import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The red check and his comment. */
export const sessionFinish: ScreenState = {
  id: 'session-finish',
  design: { board: 'Finish', section: 'The drum, and after', screen: 'Finish' },
  component: lazy(() =>
    import('../../features/session/session-fixture').then(({ SessionFixture }) => ({
      default: () => <SessionFixture which="finish" />,
    })),
  ),
  variants: classVariants(),
};
