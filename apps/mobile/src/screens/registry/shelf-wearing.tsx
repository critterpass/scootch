import { plusState } from '../../features/plus/registry/plus-state';

/** The shelf with a bought ink being worn. */
export const shelfWearing = plusState({
  id: 'shelf-wearing',
  design: null,
  undesignedReason:
    'The board draws the shelf before a purchase; afterwards the same item shows that it is being worn and has no price.',
  capture: { screen: 'shelf', owned: true },
});
