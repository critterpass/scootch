import {
  KEEPSAKES_BOARD,
  keepState,
  MADE_TO_SHARE,
} from '../../features/reveal/registry/keep-state';

/** The share panel on the day's receipt, with the foil stamp Plus adds. */
export const shareReceipt = keepState({
  id: 'share-receipt',
  design: {
    board: KEEPSAKES_BOARD,
    section: MADE_TO_SHARE,
    screen: "Receipt · today's done log",
  },
  capture: { screen: 'share', format: 'receipt' },
});
