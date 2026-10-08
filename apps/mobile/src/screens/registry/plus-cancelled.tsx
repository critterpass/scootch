import {
  LIFETIME_AND_MANAGE,
  PLUS_BOARD,
  plusState,
} from '../../features/plus/registry/plus-state';

/** Back from Apple's sheet after a cancel: gracious, and no undo. */
export const plusCancelled = plusState({
  id: 'plus-cancelled',
  design: {
    board: PLUS_BOARD,
    section: LIFETIME_AND_MANAGE,
    screen: "Cancel · after Apple's sheet",
  },
  capture: { screen: 'renewal-off', after: 'cancelled' },
});
