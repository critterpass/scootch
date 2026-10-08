import {
  KEEPSAKES_BOARD,
  keepState,
  MADE_TO_SHARE,
} from '../../features/reveal/registry/keep-state';

/** The share panel on the trading card of a catch, in the finish that is worn. */
export const shareCard = keepState({
  id: 'share-card',
  design: { board: KEEPSAKES_BOARD, section: MADE_TO_SHARE, screen: 'Share · composer' },
  capture: { screen: 'share', format: 'card' },
});
