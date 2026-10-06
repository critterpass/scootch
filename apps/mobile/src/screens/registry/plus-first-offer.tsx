import { PLUS_BOARD, plusState, WHERE_IT_LIVES } from '../../features/plus/registry/plus-state';

/** The first offer: one line, "Tell me", and one tap to wave it away. */
export const plusFirstOffer = plusState({
  id: 'plus-first-offer',
  design: {
    board: PLUS_BOARD,
    section: WHERE_IT_LIVES,
    screen: 'First offer · after the third catch',
  },
  capture: { screen: 'offer' },
});
