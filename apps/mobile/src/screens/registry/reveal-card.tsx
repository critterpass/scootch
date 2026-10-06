import { KEEPSAKES_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** The card of the catch, turned face up. */
export const revealCard = keepState({
  id: 'reveal-card',
  design: { board: KEEPSAKES_BOARD, section: '04 Made to share', screen: 'The reveal · live' },
  capture: { screen: 'reveal', step: 'card' },
});
