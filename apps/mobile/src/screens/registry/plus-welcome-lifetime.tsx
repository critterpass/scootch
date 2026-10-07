import { plusState } from '../../features/plus/registry/plus-state';

/** The welcome after a lifetime purchase, with the lighthouse that lands in the world. */
export const plusWelcomeLifetime = plusState({
  id: 'plus-welcome-lifetime',
  design: null,
  undesignedReason:
    'The board draws the welcome after the yearly trial; a lifetime purchase gets the same card, says nothing renews, and keeps the line about the lighthouse the earlier lifetime moment had.',
  capture: { screen: 'welcome', customer: 'lifetime' },
});
