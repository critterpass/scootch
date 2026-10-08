import { PLUS_BOARD, plusState, THE_STUDIO } from '../../features/plus/registry/plus-state';

/** The studio with a bought finish being worn, as the board draws it. */
export const studioWearing = plusState({
  id: 'studio-wearing',
  design: { board: PLUS_BOARD, section: THE_STUDIO, screen: 'Studio · finish' },
  capture: { screen: 'studio', tab: 'finish', trying: 'holo', worn: true },
});
