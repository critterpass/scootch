import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Tuition lapsed: Apple's win-back month offered on the receipt. */
export const tuitionWinBack: ScreenState = {
  id: 'tuition-win-back',
  design: null,
  undesignedReason:
    "The brief offers a lapsed student a free month through Apple's win-back offer; no board draws the receipt for it",
  component: lazy(() =>
    import('../../features/tuition/tuition-fixtures').then(({ ReceiptFixture }) => ({
      default: () => <ReceiptFixture stage="offer" winBack />,
    })),
  ),
  variants: classVariants(),
};
