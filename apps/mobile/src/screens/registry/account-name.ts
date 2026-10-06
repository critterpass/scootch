import { togetherState } from '../../features/table/registry/together-state';

/** Choosing the name a seat shows. */
export const accountName = togetherState({
  id: 'account-name',
  design: null,
  undesignedReason:
    'The board asks for an account but draws no screen for choosing the seat name the server screens',
  capture: 'name',
});
