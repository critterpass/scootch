import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** A happening: the cat walks across. */
export const sessionCat: ScreenState = {
  id: 'session-cat',
  design: { board: 'HapCat', section: 'Never the same twice', screen: 'HapCat' },
  component: lazy(() =>
    import('../../features/session/session-fixture').then(({ SessionFixture }) => ({
      default: () => <SessionFixture which="cat" />,
    })),
  ),
  variants: classVariants(),
};
