import { plusState } from '../../features/plus/registry/plus-state';

/** Done for today with Plus, at the day's cap. */
export const plusOneMoreCap = plusState({
  id: 'plus-one-more-cap',
  design: null,
  undesignedReason:
    'The board draws "One more" with starts left; at the cap the control stays where it is and says the day is full, so nothing jumps.',
  capture: { screen: 'one-more', plus: true, left: 0 },
});
