import { plusState } from '../../features/plus/registry/plus-state';

/** The manage page on the free app. */
export const plusManageFree = plusState({
  id: 'plus-manage-free',
  design: null,
  undesignedReason:
    'The board draws the manage page with Plus on; opened from Settings without it, the page says what free Scootch is and leaves the way to Plus as a row to tap.',
  capture: { screen: 'manage', customer: 'free' },
});
