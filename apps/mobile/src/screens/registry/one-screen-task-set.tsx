import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The task is set: the line, the treat, the length and Start. */
export const oneScreenTaskSet: ScreenState = {
  id: 'one-screen-task-set',
  design: { board: 'Scootch', section: '02 The one screen', screen: 'Task set' },
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenTaskSet,
    })),
  ),
  variants: standardVariants(),
};
