import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** The receipt before the button: the school year picked, the free week's three days. */
export const tuitionOffer: ScreenState = {
  id: 'tuition-offer',
  design: { board: 'Tuition', section: 'Tuition', screen: 'Tuition' },
  component: lazy(() =>
    import('../../features/tuition/tuition-fixtures').then(({ ReceiptFixture }) => ({
      default: () => <ReceiptFixture stage="offer" />,
    })),
  ),
  variants: classVariants(),
};
