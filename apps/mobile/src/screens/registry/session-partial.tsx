import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Not yet: partial credit and its three choices. */
export const sessionPartial: ScreenState = {
  id: 'session-partial',
  design: { board: 'Partial', section: 'The drum, and after', screen: 'Partial' },
  component: lazy(() =>
    import('../../features/session/session-fixture').then(({ SessionFixture }) => ({
      default: () => <SessionFixture which="partial" />,
    })),
  ),
  variants: classVariants(),
};
