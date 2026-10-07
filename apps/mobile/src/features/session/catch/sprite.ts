import { useMemo } from 'react';
import { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import type { AnimatedViewStyle } from '../../../ui/motion/animated-style';

/** Where a drawn thing is, in the board's points: moved, turned (degrees), scaled, faded. */
export interface Pose {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly sx: number;
  readonly sy: number;
  readonly o: number;
}

type Values = { readonly [Key in keyof Pose]: SharedValue<number> };

export interface Sprite extends Values {
  /** The animated style: opacity, and the pose as one transform. */
  readonly style: AnimatedViewStyle;
}

const REST: Pose = { x: 0, y: 0, r: 0, sx: 1, sy: 1, o: 1 };

/** One moving thing of a scene. Its pose is written from the scene's frame loop. */
export function useSprite(initial: Partial<Pose> = {}): Sprite {
  const from = { ...REST, ...initial };
  const x = useSharedValue(from.x);
  const y = useSharedValue(from.y);
  const r = useSharedValue(from.r);
  const sx = useSharedValue(from.sx);
  const sy = useSharedValue(from.sy);
  const o = useSharedValue(from.o);
  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${r.value}deg` },
      { scaleX: sx.value },
      { scaleY: sy.value },
    ],
  }));
  return useMemo(
    () => ({ x, y, r, sx, sy, o, style: style as AnimatedViewStyle }),
    [x, y, r, sx, sy, o, style],
  );
}

/** Writes part of a pose. `s` sets both scales at once. */
export function put(sprite: Sprite, pose: Partial<Pose> & { readonly s?: number }): void {
  if (pose.x !== undefined) sprite.x.value = pose.x;
  if (pose.y !== undefined) sprite.y.value = pose.y;
  if (pose.r !== undefined) sprite.r.value = pose.r;
  if (pose.s !== undefined) {
    sprite.sx.value = pose.s;
    sprite.sy.value = pose.s;
  }
  if (pose.sx !== undefined) sprite.sx.value = pose.sx;
  if (pose.sy !== undefined) sprite.sy.value = pose.sy;
  if (pose.o !== undefined) sprite.o.value = pose.o;
}
