import { PLUS_BOARD, plusState, WHERE_IT_LIVES } from '../../features/plus/registry/plus-state';

/** An open card with Plus: every finish can be chosen. */
export const plusFinishesOpen = plusState({
  id: 'plus-finishes-open',
  design: { board: PLUS_BOARD, section: WHERE_IT_LIVES, screen: 'Locked controls · free and Plus' },
  capture: { screen: 'finishes', plus: true },
});
