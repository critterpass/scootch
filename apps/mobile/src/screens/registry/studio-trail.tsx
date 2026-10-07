import { plusState } from '../../features/plus/registry/plus-state';

/** The studio on its trail tab, with a trail tried on. */
export const studioTrail = plusState({
  id: 'studio-trail',
  design: null,
  undesignedReason:
    'The board draws the studio on its finish tab; the trail tab is the same screen with the four trails as swatches and the one in focus named on the card.',
  capture: { screen: 'studio', tab: 'trail', trying: 'bubbles', worn: false },
});
