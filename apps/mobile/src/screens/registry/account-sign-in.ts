import { TABLES_FIRST_TIME, togetherState } from '../../features/table/registry/together-state';

/** Sign in with Apple, asked for only at a table: three promises, one button, a way on alone. */
export const accountSignIn = togetherState({
  id: 'account-sign-in',
  design: { ...TABLES_FIRST_TIME, screen: 'Tables need a name' },
  capture: 'sign-in',
});
