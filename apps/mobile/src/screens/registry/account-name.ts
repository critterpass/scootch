import { TABLES_FIRST_TIME, togetherState } from '../../features/table/registry/together-state';

/** Choosing the name a seat shows, with the seat drawn as the table will see it. */
export const accountName = togetherState({
  id: 'account-name',
  design: { ...TABLES_FIRST_TIME, screen: 'What the table calls you' },
  capture: 'name',
});
