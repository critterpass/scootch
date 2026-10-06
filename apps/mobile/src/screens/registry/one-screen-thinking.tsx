import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Sent, and the day store is running the care gate and the task call. */
export const oneScreenThinking: ScreenState = {
  id: 'one-screen-thinking',
  design: null,
  undesignedReason:
    'The design shows this moment only as a passing hint in the live composer, not as a screen of its own.',
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenThinking,
    })),
  ),
  variants: standardVariants(),
};
