import { useLayoutEffect, useRef } from 'react';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import { CURVES, TIMING, type Camera } from '@phusclass/art/class';

const CAMERA_EASING = Easing.bezier(...CURVES.camera);

/** A move: the camera it left and the camera it is going to. */
interface Move {
  readonly fx: number;
  readonly fy: number;
  readonly fw: number;
  readonly tx: number;
  readonly ty: number;
  readonly tw: number;
}

const UNPLACED: Move = { fx: 0, fy: 0, fw: Number.NaN, tx: 0, ty: 0, tw: Number.NaN };

/**
 * The camera `e` (eased, 0 to 1) of the way through a move, as the App board's CSS tweens
 * `scale(s) translate(-x, -y)`: the scale and the corner each move straight in the eased time, so
 * what it looks at zooms straight in rather than drifting on a curve.
 */
function cameraAt(move: Move, e: number, width: number): Camera {
  'worklet';
  const from = width / move.fw;
  const s = from + (width / move.tw - from) * e;
  return {
    x: move.fx + (move.tx - move.fx) * e,
    y: move.fy + (move.ty - move.fy) * e,
    w: width / s,
  };
}

/**
 * The camera on the UI thread: one eased progress between two shots, 1150 ms on the camera curve.
 * A new shot mid-move starts from where the camera is. Under Reduce Motion it cuts behind a short
 * fade (`veil`, the floor's colour over the room). A `drive` that holds a camera (a finger on a
 * scrubber) is followed frame by frame instead.
 */
export function useCamera(
  target: Camera,
  width: number,
  mayMove: boolean,
  drive: SharedValue<Camera | null> | undefined,
  /** The view's size, as `width x height`: a new size places the shot at once, never moves to it. */
  size: string,
) {
  // Until the first shot is placed, the view is the shot itself, never a frame of another.
  const move = useSharedValue<Move>(UNPLACED);
  const progress = useSharedValue(1);
  const veil = useSharedValue(0);
  const last = useRef<Camera | null>(null);
  const lastSize = useRef(size);

  useLayoutEffect(() => {
    const before = last.current;
    if (before && before.x === target.x && before.y === target.y && before.w === target.w) return;
    last.current = target;
    const resized = lastSize.current !== size;
    lastSize.current = size;
    const { x, y, w } = target;
    if (!before || !mayMove || resized) {
      move.set({ fx: x, fy: y, fw: w, tx: x, ty: y, tw: w });
      progress.set(1);
      if (before && !resized) {
        veil.set(
          withSequence(
            withTiming(1, { duration: 0 }),
            withTiming(0, { duration: TIMING.cameraCutFadeMs }),
          ),
        );
      }
      return;
    }
    scheduleOnUI(() => {
      'worklet';
      const now = cameraAt(move.get(), progress.get(), width);
      move.set({ fx: now.x, fy: now.y, fw: now.w, tx: x, ty: y, tw: w });
      progress.set(0);
      progress.set(withTiming(1, { duration: TIMING.cameraMs, easing: CAMERA_EASING }));
    });
  }, [target, width, size, mayMove, move, progress, veil]);

  const first = { x: target.x, y: target.y, w: target.w };
  const view = useDerivedValue(() => {
    const m = move.get();
    const c = drive?.get() ?? (Number.isNaN(m.fw) ? first : cameraAt(m, progress.get(), width));
    return [{ scale: width / c.w }, { translateX: -c.x }, { translateY: -c.y }];
  });
  return { view, veil };
}
