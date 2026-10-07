import { TABLES_WAYS_IN, togetherState } from '../../features/table/registry/together-state';

/** A friend's link, opened: who saved the seat, and the one tap that sits down. */
export const tableInviteLanding = togetherState({
  id: 'table-invite-landing',
  design: { ...TABLES_WAYS_IN, screen: "From a friend's link" },
  capture: 'invite-landing',
});
