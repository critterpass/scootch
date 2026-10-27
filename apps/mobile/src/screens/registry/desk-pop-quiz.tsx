import { lazy } from 'react';

import { classVariants } from '../../features/desk/class-fixtures';

import type { ScreenState } from './support/screen-state';

/** A pop-quiz day: fifteen-minute periods. */
export const deskPopQuiz: ScreenState = {
  id: 'desk-pop-quiz',
  design: { board: 'HapQuiz', section: 'Never the same twice', screen: 'HapQuiz' },
  component: lazy(() =>
    import('../../features/desk/desk-fixture').then(({ DeskFixture }) => ({
      default: () => <DeskFixture which="pop-quiz" />,
    })),
  ),
  variants: classVariants(),
};
