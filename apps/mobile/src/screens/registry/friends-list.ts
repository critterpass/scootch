import { togetherState } from '../../features/table/registry/together-state';

/** The friends page. */
export const friendsList = togetherState({
  id: 'friends-list',
  design: null,
  undesignedReason:
    'No board draws a friends page; the brief asks for a small one with remove, block and the haunt switch',
  capture: 'friends',
});
