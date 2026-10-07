import { MATERIALS_BOARD, plusState, THE_STUDIO } from '../../features/plus/registry/plus-state';

/** The studio with a finish in focus, tried on before it is bought. */
export const studioTryingOn = plusState({
  id: 'studio-trying-on',
  design: { board: MATERIALS_BOARD, section: THE_STUDIO, screen: 'Studio · live try-on' },
  capture: { screen: 'studio', tab: 'finish', trying: 'holo', worn: false },
});
