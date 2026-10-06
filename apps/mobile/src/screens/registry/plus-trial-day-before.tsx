import { PLUS_BOARD, plusState, TRIAL_AND_RENEWAL } from '../../features/plus/registry/plus-state';

/** The day before the trial's charge: the plain note on the one screen. */
export const plusTrialDayBefore = plusState({
  id: 'plus-trial-day-before',
  design: { board: PLUS_BOARD, section: TRIAL_AND_RENEWAL, screen: 'Trial · the day before' },
  capture: { screen: 'charge-note' },
});
