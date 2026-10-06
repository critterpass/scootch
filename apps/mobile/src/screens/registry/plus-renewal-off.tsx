import { PLUS_BOARD, plusState, TRIAL_AND_RENEWAL } from '../../features/plus/registry/plus-state';

/** Renewal is off, read back from the store. */
export const plusRenewalOff = plusState({
  id: 'plus-renewal-off',
  design: { board: PLUS_BOARD, section: TRIAL_AND_RENEWAL, screen: 'Renewal off · confirmed' },
  capture: { screen: 'renewal-off', after: 'renewal_off' },
});
