import { KEEPSAKES_BOARD, keepState, THE_BINDER } from '../../features/reveal/registry/keep-state';

/** The binder's shelf with Plus: every order of it, and the month pages, open. */
export const zooBinder = keepState({
  id: 'zoo-binder',
  design: { board: KEEPSAKES_BOARD, section: THE_BINDER, screen: 'Binder · shelf' },
  capture: { screen: 'zoo', cards: 12, plus: true },
});
