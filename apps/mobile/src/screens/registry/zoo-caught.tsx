import { PLUS_BOARD, keepState } from '../../features/reveal/registry/keep-state';

/** The zoo in the free app: every card, and the binder drawn locked. */
export const zooCaught = keepState({
  id: 'zoo-caught',
  design: {
    board: PLUS_BOARD,
    section: '01 Scootch Plus · where it lives',
    screen: 'Locked controls · free and Plus',
  },
  capture: { screen: 'zoo', cards: 12, plus: false },
});
