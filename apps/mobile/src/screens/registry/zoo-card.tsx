import { KEEPSAKES_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** One caught card at full size. */
export const zooCard = keepState({
  id: 'zoo-card',
  design: {
    board: KEEPSAKES_BOARD,
    section: '01 The task becomes a creature',
    screen: 'Caught card · live',
  },
  capture: { screen: 'zoo', cards: 12, plus: false, open: true },
});
