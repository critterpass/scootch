import { PHU_ROOM_SIZE, PHU_SPOTS, type Camera } from '@phusclass/art/class';

import type { FoldLayout, FoldPose } from '../../ui/fold/fold-layout';
import type { Frame } from '../../ui/motion/hand-off';

/** The chalkboard on the wall of the wide room (the Room board), in room units. */
const CHALKBOARD = { x: 480, y: 100, width: 640, height: 196 } as const;

/**
 * Where the Duo boards put his bubble, in each board's own frame:
 * `[board width, board height, left, top]`.
 */
const BUBBLES: Readonly<Record<Exclude<FoldPose, 'phone'>, readonly number[]>> = {
  closed: [480, 620, 18, 214],
  open: [960, 620, 664, 104],
  book: [960, 620, 528, 104],
  stand: [620, 960, 24, 250],
  split: [476, 620, 80, 250],
};

/** Where his bubble sits and how wide it may grow, in window points. */
export interface DuoBubble {
  readonly left: number;
  readonly top: number;
  readonly maxWidth?: number;
}

/** How far down him his shoulders are, of his height in the room. */
const SHOULDER = 0.5;
/** The bubble's tail may reach this far over his outline, in points. */
const TAIL_OVERLAP = 16;

/**
 * His bubble's place on iPhone Duo, scaled from its board to the window it has. Closed, as
 * DuoClosed draws it, it sits to his left at shoulder height and never grows over his head:
 * its width stops at his outline, wherever the camera puts him.
 */
export function duoBubble(fold: FoldLayout, camera?: Camera): DuoBubble {
  if (fold.pose === 'phone') return { left: 18, top: 118 };
  if (fold.pose === 'closed' && camera) {
    const k = fold.room.width / camera.w;
    const left = 18;
    const himLeft = (PHU_SPOTS.front.x - camera.x) * k;
    const shoulders = (PHU_SPOTS.front.y + PHU_ROOM_SIZE * SHOULDER - camera.y) * k;
    return { left, top: shoulders - 44, maxWidth: Math.max(140, himLeft - left + TAIL_OVERLAP) };
  }
  const [w = 1, h = 1, left = 0, top = 0] = BUBBLES[fold.pose];
  return { left: (left * fold.width) / w, top: (top * fold.height) / h };
}

/** The chalkboard's frame on screen through a Duo camera, for its tap and the board's growth. */
export function duoChalkboard(camera: Camera, roomWidth: number): Frame {
  const k = roomWidth / camera.w;
  return {
    x: (CHALKBOARD.x - camera.x) * k,
    y: (CHALKBOARD.y - camera.y) * k,
    width: CHALKBOARD.width * k,
    height: CHALKBOARD.height * k,
  };
}
