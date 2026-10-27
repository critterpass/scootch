import type { Camera } from '@phusclass/art/class';

import type { FoldLayout, FoldPose } from './fold-layout';

/**
 * The Duo board's rooms: each pose sees the wide room (the Room board) through its own camera,
 * drawn for a room of the board's width. `[room width, camera x, camera y, camera width]`.
 */
const DUO_ROOMS: Readonly<Record<Exclude<FoldPose, 'phone'>, readonly number[]>> = {
  closed: [480, 452, 22, 560],
  open: [960, 40, 30, 1180],
  book: [960, 40, 30, 1180],
  stand: [620, 380, 40, 1000],
  split: [476, 414, 20, 680],
};

export interface FoldRoom {
  readonly composition: 'wide';
  readonly camera: Camera;
  /** Opened out the chalkboard is the left page: its place on the wall is left empty. */
  readonly board: 'on' | 'off';
}

/**
 * How the room is seen on iPhone Duo, as its boards draw it: the wide room, the board's camera
 * kept about the same centre and widened or narrowed with the room's real width. Null on a phone,
 * which keeps its own room and shots.
 */
export function foldRoom(layout: FoldLayout): FoldRoom | null {
  if (layout.pose === 'phone') return null;
  const [designWidth = 1, x = 0, y = 0, w = 1] = DUO_ROOMS[layout.pose];
  const width = (w * layout.room.width) / designWidth;
  const centre = x + w / 2;
  return {
    composition: 'wide',
    camera: { x: centre - width / 2, y, w: width },
    board: layout.pose === 'open' || layout.pose === 'book' ? 'off' : 'on',
  };
}
