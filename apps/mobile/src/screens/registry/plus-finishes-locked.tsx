import { PLUS_BOARD, plusState, WHERE_IT_LIVES } from '../../features/plus/registry/plus-state';

/** An open card on the free app: the standard finish, and four with a lock. */
export const plusFinishesLocked = plusState({
  id: 'plus-finishes-locked',
  design: { board: PLUS_BOARD, section: WHERE_IT_LIVES, screen: 'Locked controls · free and Plus' },
  capture: { screen: 'finishes', plus: false },
});
