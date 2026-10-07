import type { Box } from '@scootch/domain';

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Where a box found in a photo lands on the screen. The photo fills the screen and is cropped
 * evenly at the sides or at the top and bottom (as `cover` draws it), so a box is scaled with it
 * and shifted by what was cropped. A box may land partly off the screen; it is not clipped here.
 */
export function boxOnScreen(box: Box, photo: Size, screen: Size): Rect {
  if (photo.width <= 0 || photo.height <= 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  const scale = Math.max(screen.width / photo.width, screen.height / photo.height);
  const drawn = { width: photo.width * scale, height: photo.height * scale };
  const shiftX = (screen.width - drawn.width) / 2;
  const shiftY = (screen.height - drawn.height) / 2;
  return {
    left: shiftX + box[0] * drawn.width,
    top: shiftY + box[1] * drawn.height,
    width: box[2] * drawn.width,
    height: box[3] * drawn.height,
  };
}

/** A circle around a box, a little wider than the box so the ring never sits on the thing. */
export function ringAround(rect: Rect, margin = 10): Rect {
  const diameter = Math.max(rect.width, rect.height) + margin * 2;
  return {
    left: rect.left + rect.width / 2 - diameter / 2,
    top: rect.top + rect.height / 2 - diameter / 2,
    width: diameter,
    height: diameter,
  };
}
