import { STAGE } from './math';

export interface BoardFit {
  /** How much the board is scaled. */
  readonly scale: number;
  /** Where the scaled board's top left corner sits on the screen. */
  readonly left: number;
  readonly top: number;
}

/**
 * Fits the board to a phone. It is as wide as the phone when it can be, and never so big that the
 * part the catch is drawn in (`drawn`, in the board's points) does not fit the room the screen
 * leaves for it (`room`, in the screen's points: under the top row and the words, above the foot).
 * It sits in the middle of the screen, as on the board's own phone, and moves up or down only as
 * far as it takes to bring the drawn part into that room. So a short phone gives up empty paper,
 * not size.
 */
export function fitBoard(
  screen: { readonly width: number; readonly height: number },
  drawn: { readonly top: number; readonly bottom: number },
  room: { readonly top: number; readonly bottom: number },
): BoardFit {
  const scale = Math.min(
    screen.width / STAGE.width,
    Math.max(0, room.bottom - room.top) / (drawn.bottom - drawn.top),
  );
  let top = (screen.height - STAGE.height * scale) / 2;
  const over = top + drawn.bottom * scale - room.bottom;
  if (over > 0) top -= over;
  const under = room.top - (top + drawn.top * scale);
  if (under > 0) top += under;
  return { scale, left: (screen.width - STAGE.width * scale) / 2, top };
}
