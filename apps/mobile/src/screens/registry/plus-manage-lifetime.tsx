import { plusState } from '../../features/plus/registry/plus-state';

/** Your card after a lifetime purchase. */
export const plusManageLifetime = plusState({
  id: 'plus-manage-lifetime',
  design: null,
  undesignedReason:
    'The board draws the card on a subscription; a lifetime purchase has nothing to renew or manage, and the page says so.',
  capture: { screen: 'manage', customer: 'lifetime' },
});
