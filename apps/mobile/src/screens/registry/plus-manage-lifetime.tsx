import { plusState } from '../../features/plus/registry/plus-state';

/** The manage page after a lifetime purchase. */
export const plusManageLifetime = plusState({
  id: 'plus-manage-lifetime',
  design: null,
  undesignedReason:
    'The board draws the manage page on a subscription; a lifetime purchase has nothing to renew, change or cancel, and the page says so.',
  capture: { screen: 'manage', customer: 'lifetime' },
});
