import { TABLES_FIRST_TIME, togetherState } from '../../features/table/registry/together-state';

/** Apple's sheet was closed: the task is still set, and it starts alone from here. */
export const accountSignInCancelled = togetherState({
  id: 'account-sign-in-cancelled',
  design: { ...TABLES_FIRST_TIME, screen: 'Changed your mind' },
  capture: 'sign-in-cancelled',
});
