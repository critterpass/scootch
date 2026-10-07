import { keepState, MATERIALS_BOARD } from '../../features/reveal/registry/keep-state';

/** The share panel on the day's receipt, with the foil stamp Plus adds. */
export const shareReceipt = keepState({
  id: 'share-receipt',
  design: {
    board: MATERIALS_BOARD,
    section: '04 Made to share',
    screen: "Receipt · today's done log",
  },
  capture: { screen: 'share', format: 'receipt' },
});
