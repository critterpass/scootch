import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Settings when no spare copy can be kept: Scootch says so at the foot of the page. */
export const settingsBackupOff: ScreenState = {
  id: 'settings-backup-off',
  design: null,
  undesignedReason:
    'The boards do not draw what Scootch says when iCloud Keychain and iCloud storage are both off; it is one line at the foot of Settings.',
  component: lazy(() =>
    import('../../features/settings/captures').then((captures) => ({
      default: captures.SettingsBackupOff,
    })),
  ),
  variants: standardVariants(),
};
