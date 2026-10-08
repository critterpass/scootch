import { KEEPSAKES_BOARD, keepState, THE_BINDER } from '../../features/reveal/registry/keep-state';

/** The binder's month pages, on a month that filled its nine pockets and was stamped. */
export const binderPages = keepState({
  id: 'binder-pages',
  design: { board: KEEPSAKES_BOARD, section: THE_BINDER, screen: 'Pages · month complete · Plus' },
  capture: { screen: 'pages' },
});
