import { KEEPSAKES_BOARD, keepState, THE_BINDER } from '../../features/reveal/registry/keep-state';

/** One card out of its pocket, on the binder's dark stage. */
export const zooCard = keepState({
  id: 'zoo-card',
  design: { board: KEEPSAKES_BOARD, section: THE_BINDER, screen: 'Card · front and back' },
  capture: { screen: 'zoo', cards: 12, plus: false, open: true },
});
