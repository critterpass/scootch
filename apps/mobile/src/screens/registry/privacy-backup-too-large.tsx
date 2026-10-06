import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Privacy and data when the spare copy could not be kept: one plain line under the rows. */
export const privacyBackupTooLarge: ScreenState = {
  id: 'privacy-backup-too-large',
  design: null,
  undesignedReason:
    'The board draws no backup that cannot be kept. The line sits under the rows, where a failed export is said, and says the world is still on the phone.',
  component: lazy(() =>
    import('../../features/settings/captures').then((captures) => ({
      default: captures.PrivacyBackupTooLargeCapture,
    })),
  ),
  variants: standardVariants(),
};
