import { keepState } from '../../features/reveal/registry/keep-state';

/** The zoo before the first catch. */
export const zooEmpty = keepState({
  id: 'zoo-empty',
  design: null,
  undesignedReason:
    'The board draws the zoo with cards in it; day zero has none, so it says where the first one will land.',
  capture: { screen: 'zoo', cards: 0, plus: false },
});
