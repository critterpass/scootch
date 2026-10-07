import { plusState } from '../../features/plus/registry/plus-state';

/** The page on the free app: no card, what free Scootch is, and the way to Plus. */
export const plusManageFree = plusState({
  id: 'plus-manage-free',
  design: null,
  undesignedReason:
    'The board draws the page with Plus on; opened from Settings without it there is no member card, so the page says what free Scootch is and leaves the ways to Plus and the studio as rows to tap.',
  capture: { screen: 'manage', customer: 'free' },
});
