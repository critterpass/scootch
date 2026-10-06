import { PLUS_BOARD, plusState, TRIAL_AND_RENEWAL } from '../../features/plus/registry/plus-state';

/** The trial's last day: three choices of the same size. */
export const plusTrialLastDay = plusState({
  id: 'plus-trial-last-day',
  design: { board: PLUS_BOARD, section: TRIAL_AND_RENEWAL, screen: 'Trial · last day' },
  capture: { screen: 'last-day' },
});
