import { PLUS_BOARD, plusState, WHERE_IT_LIVES } from '../../features/plus/registry/plus-state';

/** Done for today on the free app: "One more" under the world row, quiet and locked. */
export const plusOneMoreLocked = plusState({
  id: 'plus-one-more-locked',
  design: { board: PLUS_BOARD, section: WHERE_IT_LIVES, screen: 'Locked controls · free and Plus' },
  capture: { screen: 'one-more', plus: false, left: 0 },
});
