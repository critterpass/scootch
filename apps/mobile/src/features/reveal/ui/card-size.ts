import { CARD_BLEED, CARD_HEIGHT, CARD_WIDTH } from '@scootch/art';

/** The canvas a card is drawn in for a card of this width: the card and the stamp's overhang. */
export function cardCanvasSize(cardWidth: number): { width: number; height: number } {
  const scale = cardWidth / CARD_WIDTH;
  return {
    width: (CARD_WIDTH + CARD_BLEED * 2) * scale,
    height: (CARD_HEIGHT + CARD_BLEED * 2) * scale,
  };
}

/** The smallest a card is ever drawn: below this its text is not for reading. */
const SMALLEST = 120;

/**
 * The widest the card may be drawn in a space: the board's 330 points, or what fits with its
 * canvas inside the space.
 */
export function cardWidthIn(space: { readonly width: number; readonly height: number }): number {
  const canvas = cardCanvasSize(CARD_WIDTH);
  const fits = Math.min(space.width / canvas.width, space.height / canvas.height, 1);
  return Math.max(SMALLEST, CARD_WIDTH * fits);
}
