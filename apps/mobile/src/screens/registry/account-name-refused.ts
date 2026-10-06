import { togetherState } from '../../features/table/registry/together-state';

/** A name the server would not keep, said plainly. */
export const accountNameRefused = togetherState({
  id: 'account-name-refused',
  design: null,
  undesignedReason: 'The board draws no refused name',
  capture: 'name-refused',
});
