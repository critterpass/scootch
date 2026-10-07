import { PLUS_BOARD, plusState, WHERE_IT_LIVES } from '../../features/plus/registry/plus-state';

/** Done for today on the free app with starts left: "One more" simply starts another thing. */
export const plusOneMoreFree = plusState({
  id: 'plus-one-more-free',
  design: { board: PLUS_BOARD, section: WHERE_IT_LIVES, screen: 'Locked controls · free and Plus' },
  capture: { screen: 'one-more', plus: false, left: 2 },
});
