import { FRIEND_PASS, togetherState } from '../../features/table/registry/together-state';

/** Sign in with Apple, asked for only at a table. */
export const accountSignIn = togetherState({
  id: 'account-sign-in',
  design: { ...FRIEND_PASS, screen: 'Friend pass · free friend arrives' },
  capture: 'sign-in',
});
