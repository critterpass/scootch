import { plusState } from '../../features/plus/registry/plus-state';

/** The welcome after a plain monthly subscription. */
export const plusWelcomeMonthly = plusState({
  id: 'plus-welcome-monthly',
  design: null,
  undesignedReason:
    'The board draws the welcome after the yearly trial; a monthly subscription gets the same card and says when it renews in place of the trial dates.',
  capture: { screen: 'welcome', customer: 'monthly' },
});
