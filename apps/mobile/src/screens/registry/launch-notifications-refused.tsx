import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The warm-up ask after the system's notification prompt was refused. */
export const launchNotificationsRefused: ScreenState = {
  id: 'launch-notifications-refused',
  design: null,
  undesignedReason:
    'The design has no screen for a refused notification prompt. The warm-up ask carries one plain line saying so, once.',
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.LaunchNotificationsRefused,
    })),
  ),
  variants: standardVariants(),
};
