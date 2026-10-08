import { plusState } from '../../features/plus/registry/plus-state';

/** The studio with a finish in focus, tried on before it is bought. */
export const studioTryingOn = plusState({
  id: 'studio-trying-on',
  design: null,
  undesignedReason:
    'The board draws the finish in focus as owned and worn; before it is bought the same stage says it is being tried on, the swatch shows its price and the action buys it.',
  capture: { screen: 'studio', tab: 'finish', trying: 'holo', worn: false },
});
