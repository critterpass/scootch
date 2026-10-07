import { plusState } from '../../features/plus/registry/plus-state';

/** Your card during the trial. */
export const plusManageTrial = plusState({
  id: 'plus-manage-trial',
  design: null,
  undesignedReason:
    'The board draws the card on a paid year; during the trial the same page says when the free week ends and that a reminder comes the day before.',
  capture: { screen: 'manage', customer: 'trial' },
});
