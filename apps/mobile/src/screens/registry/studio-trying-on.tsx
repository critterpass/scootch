import { PLUS_BOARD, plusState, THE_STUDIO } from '../../features/plus/registry/plus-state';

/** The studio with a finish in focus, tried on before it is bought. */
export const studioTryingOn = plusState({
  id: 'studio-trying-on',
  design: { board: PLUS_BOARD, section: THE_STUDIO, screen: 'Studio · finish' },
  capture: { screen: 'studio', tab: 'finish', trying: 'holo', worn: false },
});
