import { togetherState } from '../../features/table/registry/together-state';

/** Privacy and data on a phone signed in for tables. */
export const privacyAccount = togetherState({
  id: 'privacy-account',
  design: null,
  undesignedReason:
    'The board draws privacy without an account; a phone signed in for tables shows it, with delete',
  capture: 'privacy-account',
});
