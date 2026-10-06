import {
  LIFETIME_SHELF_MANAGE,
  PLUS_BOARD,
  plusState,
} from '../../features/plus/registry/plus-state';

/** The manage page on a yearly plan. */
export const plusManageYearly = plusState({
  id: 'plus-manage-yearly',
  design: { board: PLUS_BOARD, section: LIFETIME_SHELF_MANAGE, screen: 'Manage' },
  capture: { screen: 'manage', customer: 'yearly' },
});
