import { PLUS_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** The binder's shelf in the free app: every card, with its other orders and its pages tagged Plus. */
export const zooCaught = keepState({
  id: 'zoo-caught',
  design: {
    board: PLUS_BOARD,
    section: '01 Scootch Plus · where it lives',
    screen: 'Locked controls · free and Plus',
  },
  capture: { screen: 'zoo', cards: 12, plus: false },
});
