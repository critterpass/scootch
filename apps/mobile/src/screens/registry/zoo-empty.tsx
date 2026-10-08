import { keepState } from '../../features/reveal/registry/keep-state';

/** The binder's shelf before the first catch. */
export const zooEmpty = keepState({
  id: 'zoo-empty',
  design: null,
  undesignedReason:
    'The board draws the shelf with cards on it; day zero has none, so it says where the first one will land, under an empty month.',
  capture: { screen: 'zoo', cards: 0, plus: false },
});
