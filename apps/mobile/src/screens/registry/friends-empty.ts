import { togetherState } from '../../features/table/registry/together-state';

/** The friends page with nobody on it yet. */
export const friendsEmpty = togetherState({
  id: 'friends-empty',
  design: null,
  undesignedReason: 'No board draws a friends page',
  capture: 'friends-empty',
});
