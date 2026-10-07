import { keepState, MATERIALS_BOARD } from '../../features/reveal/registry/keep-state';

/** The share panel on the trading card of a catch, in the finish that is worn. */
export const shareCard = keepState({
  id: 'share-card',
  design: { board: MATERIALS_BOARD, section: '04 Made to share', screen: 'Trading card · foil' },
  capture: { screen: 'share', format: 'card' },
});
