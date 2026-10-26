import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Change the name he calls, from the student card: the board links it to roll call, outside the first day. */
export const settingsName: ScreenState = {
  id: 'settings-name',
  design: null,
  undesignedReason:
    'Change the name he calls, from the student card: the board links it to roll call, outside the first day.',
  component: lazy(() =>
    import('../../features/settings/name-screen').then((screen) => ({
      default: () => <screen.NameScreen typedName="Trần Minh Anh" />,
    })),
  ),
  variants: standardVariants(['keyboard-open']),
};
