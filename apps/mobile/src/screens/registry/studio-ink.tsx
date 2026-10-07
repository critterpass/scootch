import { plusState } from '../../features/plus/registry/plus-state';

/** The studio on its ink tab, with an ink tried on. */
export const studioInk = plusState({
  id: 'studio-ink',
  design: null,
  undesignedReason:
    'The board draws the studio on its finish tab; the ink tab is the same screen with the five inks as swatches and Scootch on the card printed in the one in focus.',
  capture: { screen: 'studio', tab: 'ink', trying: 'midnight', worn: false },
});
