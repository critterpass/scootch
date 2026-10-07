import { plusState } from '../../features/plus/registry/plus-state';

/** The studio with a bought finish being worn. */
export const studioWearing = plusState({
  id: 'studio-wearing',
  design: null,
  undesignedReason:
    'The board draws the studio before a purchase; afterwards the same item says it is being worn, shows that it is owned and has no price.',
  capture: { screen: 'studio', tab: 'finish', trying: 'holo', worn: true },
});
