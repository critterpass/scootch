import { keepState, MATERIALS_BOARD } from '../../features/reveal/registry/keep-state';

/** The share panel on the sticker sheet. */
export const shareStickers = keepState({
  id: 'share-stickers',
  design: {
    board: MATERIALS_BOARD,
    section: '04 Made to share',
    screen: 'Sticker sheet · die-cut',
  },
  capture: { screen: 'share', format: 'stickers' },
});
