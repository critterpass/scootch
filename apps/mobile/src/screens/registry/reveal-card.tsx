import {
  KEEPSAKES_BOARD,
  keepState,
  MADE_TO_SHARE,
} from '../../features/reveal/registry/keep-state';

/** The card of the catch, turned face up. */
export const revealCard = keepState({
  id: 'reveal-card',
  design: { board: KEEPSAKES_BOARD, section: MADE_TO_SHARE, screen: 'The reveal · live' },
  capture: { screen: 'reveal', step: 'card' },
});
