import { PLUS_BOARD, plusState, THE_STUDIO } from '../../features/plus/registry/plus-state';

/** Your card on a yearly plan. */
export const plusManageYearly = plusState({
  id: 'plus-manage-yearly',
  design: { board: PLUS_BOARD, section: THE_STUDIO, screen: 'Your card · Settings' },
  capture: { screen: 'manage', customer: 'yearly' },
});
