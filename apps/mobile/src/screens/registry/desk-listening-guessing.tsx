import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Holding to tell him: the phrase still being guessed, lighter until it settles. */
export const deskListeningGuessing: ScreenState = {
  id: 'desk-listening-guessing',
  design: null,
  undesignedReason:
    'The Listening board draws settled words only. The same words at half strength until the transcriber settles them.',
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="guessing" />,
    })),
  ),
  variants: classVariants(),
};
