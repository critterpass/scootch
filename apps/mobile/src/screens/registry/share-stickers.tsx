import {
  KEEPSAKES_BOARD,
  keepState,
  MADE_TO_SHARE,
} from '../../features/reveal/registry/keep-state';

/** The share panel on the sticker sheet. */
export const shareStickers = keepState({
  id: 'share-stickers',
  design: {
    board: KEEPSAKES_BOARD,
    section: MADE_TO_SHARE,
    screen: 'Sticker pack · Messages',
  },
  capture: { screen: 'share', format: 'stickers' },
});
