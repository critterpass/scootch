import { PLUS_BOARD, plusState, THE_STUDIO } from '../../features/plus/registry/plus-state';

/** The studio on its ink tab, with an ink tried on: the one screen, a widget and the card's corner. */
export const studioInk = plusState({
  id: 'studio-ink',
  design: { board: PLUS_BOARD, section: THE_STUDIO, screen: 'Studio · ink' },
  capture: { screen: 'studio', tab: 'ink', trying: 'midnight', worn: false },
});
