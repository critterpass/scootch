import { PLUS_BOARD, plusState, THE_STUDIO } from '../../features/plus/registry/plus-state';

/** The studio on its trail tab, with a trail tried on over a catch. */
export const studioTrail = plusState({
  id: 'studio-trail',
  design: { board: PLUS_BOARD, section: THE_STUDIO, screen: 'Studio · trail' },
  capture: { screen: 'studio', tab: 'trail', trying: 'bubbles', worn: false },
});
