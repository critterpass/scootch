import { KEEPSAKES_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** The zoo with Plus: the binder open, with its sorting. */
export const zooBinder = keepState({
  id: 'zoo-binder',
  design: { board: KEEPSAKES_BOARD, section: '04 Made to share', screen: 'The binder · Plus' },
  capture: { screen: 'zoo', cards: 12, plus: true },
});
