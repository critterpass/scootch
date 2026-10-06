import { PLUS_BOARD, plusState, TRIAL_AND_RENEWAL } from '../../features/plus/registry/plus-state';

/** The trial has started: the reminder day and the charge day, both up front. */
export const plusTrialStarted = plusState({
  id: 'plus-trial-started',
  design: { board: PLUS_BOARD, section: TRIAL_AND_RENEWAL, screen: 'Trial · started' },
  capture: { screen: 'trial-started' },
});
