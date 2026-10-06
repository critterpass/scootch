import { PLUS_BOARD, plusState, WHERE_IT_LIVES } from '../../features/plus/registry/plus-state';

/** Done for today with Plus: two more things can still be started. */
export const plusOneMoreOpen = plusState({
  id: 'plus-one-more-open',
  design: { board: PLUS_BOARD, section: WHERE_IT_LIVES, screen: 'Locked controls · free and Plus' },
  capture: { screen: 'one-more', plus: true, left: 2 },
});
