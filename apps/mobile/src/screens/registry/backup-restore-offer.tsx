import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** A new phone that already holds the backup token: the one line offering the world back. */
export const backupRestoreOffer: ScreenState = {
  id: 'backup-restore-offer',
  design: null,
  undesignedReason:
    'The boards do not draw the restore offer; it is Scootch, one line and two choices, before first launch.',
  component: lazy(() =>
    import('../../features/settings/captures').then((captures) => ({
      default: captures.RestoreOfferCapture,
    })),
  ),
  variants: standardVariants(),
};
