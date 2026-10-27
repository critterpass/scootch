import { PHONE_FRAMINGS, type Camera, type Framing } from '@phusclass/art/class';

import { boardIsPage, type FoldLayout } from './fold-layout';

/** Opened out, the room is seen a little further back, as on the Duo board (1180 units on 960). */
const OPEN_SCALE = 0.8;

/**
 * The classroom's camera for a named shot on iPhone Duo: the same shot, turned so he stands in
 * the middle of the part of the room that is not under the controls or the board's page. Null on
 * a phone, which takes the shot as it is.
 */
export function foldCamera(name: Framing, layout: FoldLayout): Camera | null {
  if (layout.pose === 'phone') return null;
  const shot = PHONE_FRAMINGS[name];
  const scale = shot.scale * (boardIsPage(layout.pose) ? OPEN_SCALE : 1);
  const centre = layout.focus.x + layout.focus.width / 2;
  return { x: shot.cx - centre / scale, y: shot.y, w: layout.room.width / scale };
}
