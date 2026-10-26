import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** Recess after the third finish: the tuition notice pinned on the chalkboard. */
export const deskRecessNotice: ScreenState = {
  id: 'desk-recess-notice',
  design: { board: 'RecessNotice', section: 'The drum, and after', screen: 'RecessNotice' },
  component: lazy(() =>
    import('../../features/tuition/tuition-fixtures').then(({ RecessNoticeFixture }) => ({
      default: () => <RecessNoticeFixture />,
    })),
  ),
  variants: classVariants(),
};
