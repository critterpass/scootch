import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The set task with company chosen: "At a table" under the length, and "Start at a table". */
export const oneScreenTaskSetAtTable: ScreenState = {
  id: 'one-screen-task-set-at-table',
  design: { board: 'Tables', section: '01 Ways in', screen: 'From a set task' },
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenTaskSetAtTable,
    })),
  ),
  variants: standardVariants(),
};
