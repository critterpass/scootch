import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/**
 * After the crisis screen is closed: the desk's task with no fuse, pressure, tally, slip or joke,
 * and his plain company, until something said afterwards is screened and cleared.
 */
export const deskPlainCompany: ScreenState = {
  id: 'desk-plain-company',
  design: null,
  undesignedReason:
    'The brief has him keep plain company after the crisis screen is closed; no board draws the desk then. The Desk board with nothing that presses and his quiet line',
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="plain" />,
    })),
  ),
  variants: classVariants(),
};
