import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { GROUND_Y, VIEW_SIZE } from '@scootch/art';
import type { MonsterRow } from '@scootch/domain';
import { fonts } from '@scootch/tokens';

import { Monster } from '../../../art/Monster';
import type { SessionInks } from '../ui/session-inks';

import { keyed, STAGE } from './math';
import type { MonsterMood, Rig } from './rig';
import { put, useSprite, type Sprite } from './sprite';

/** The monster as every catch stands it: 240 points, as the board draws it. */
export const MONSTER_SIZE = 240;
/** How far down its box the middle of a monster's body is: what it tumbles about. */
const MIDDLE = 0.625;
/** How far down its box a monster's feet are. */
export const feetOf = (size: number): number => (size * GROUND_Y) / VIEW_SIZE;

export interface SceneMonsterProps {
  readonly monster: MonsterRow;
  readonly mood: MonsterMood;
  readonly sprite: Sprite;
  readonly still: boolean;
  readonly size?: number;
  /** Where its box sits before the sprite moves it. */
  readonly left?: number;
  readonly top?: number;
  /** What it turns and squashes about: its feet unless told otherwise. */
  readonly origin?: string;
  /** A second sprite that turns it about its middle, for a tumble. */
  readonly spin?: Sprite;
  readonly zIndex?: number;
}

/**
 * The task's monster inside a scene, moved by its sprite. It takes no touch, and is drawn again
 * only when the monster or its mood changes, however often the scene around it is.
 */
export const SceneMonster = memo(function SceneMonster({
  monster,
  mood,
  sprite,
  still,
  size = MONSTER_SIZE,
  left = 0,
  top = 0,
  origin,
  spin,
  zIndex,
}: SceneMonsterProps) {
  const drawn = (
    <Monster
      spec={monster.spec}
      idle={!still}
      mood={mood}
      reducedMotion={still}
      size={size}
      testID="session-catch-monster"
    />
  );
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.at,
        {
          left,
          top,
          width: size,
          height: size,
          transformOrigin: origin ?? `${size / 2}px ${feetOf(size)}px`,
          ...(zIndex === undefined ? {} : { zIndex }),
        },
        sprite.style,
      ]}
    >
      {spin ? (
        <Animated.View
          style={[
            { width: size, height: size, transformOrigin: `${size / 2}px ${size * MIDDLE}px` },
            spin.style,
          ]}
        >
          {drawn}
        </Animated.View>
      ) : (
        drawn
      )}
    </Animated.View>
  );
});

/** The line a scene stands on. */
export function Floor({ y, inks }: { readonly y: number; readonly inks: SessionInks }) {
  return <View style={[styles.floor, { top: y, backgroundColor: inks.hairline }]} />;
}

/** A soft shadow on the floor, moved and shrunk by its sprite. */
export function Shadow({
  sprite,
  left,
  top,
  width,
  height,
}: {
  readonly sprite: Sprite;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}) {
  return (
    <Animated.View style={[styles.at, styles.shadow, { left, top, width, height }, sprite.style]} />
  );
}

/** The CAUGHT stamp, unseen until it is thwacked down. */
export function Stamp({
  sprite,
  x,
  y,
  label,
  inks,
}: {
  readonly sprite: Sprite;
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly inks: SessionInks;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.at,
        styles.stamp,
        { left: x, top: y, backgroundColor: inks.tomato, borderColor: inks.page },
        sprite.style,
      ]}
    >
      <Animated.Text allowFontScaling={false} style={[styles.stampText, { color: inks.onTomato }]}>
        {label}
      </Animated.Text>
    </Animated.View>
  );
}

/** A stamp's pose before it lands: nothing to see. */
export const STAMP_AWAY = { o: 0, r: 9 } as const;

/** Brings a stamp down hard: big and askew, then flat with a small bounce. */
export function thwack(rig: Rig, stamp: Sprite): void {
  rig.tw(420, (k) =>
    put(stamp, {
      o: Math.min(1, k * 2),
      r: keyed(k, [
        [0, 30],
        [0.5, 6],
        [0.75, 9],
        [1, 9],
      ]),
      s: keyed(k, [
        [0, 2.4],
        [0.5, 0.9],
        [0.75, 1.06],
        [1, 1],
      ]),
    }),
  );
}

/** A squash that springs back: `[at, sx, sy]` keyframes written to a sprite over `ms`. */
export function squash(
  rig: Rig,
  sprite: Sprite,
  ms: number,
  frames: readonly (readonly [number, number, number])[],
): void {
  rig.tw(ms, (k) =>
    put(sprite, {
      sx: keyed(
        k,
        frames.map(([at, sx]) => [at, sx] as const),
      ),
      sy: keyed(
        k,
        frames.map(([at, , sy]) => [at, sy] as const),
      ),
    }),
  );
}

/** A scene's drawing surface: the board's phone, drawn at the board's size. */
export function Board({
  children,
  style,
}: {
  readonly children: ReactNode;
  readonly style?: ViewProps['style'];
}) {
  return (
    <View pointerEvents="none" style={[styles.board, style]}>
      {children}
    </View>
  );
}

export { useSprite };
export { Binder, BINDER_AT, bumpBinder, flyToBinder } from './binder';
export { Ink, type InkHandle, type InkStroke } from './ink';
export { DUST, Puffs, type PuffOptions, type PuffsHandle } from './puffs';

const styles = StyleSheet.create({
  at: { position: 'absolute' },
  board: { width: STAGE.width, height: STAGE.height },
  // A little past the board, so a line that runs off it (a rod, a rope's tail) is not cut short.
  ink: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: STAGE.width + 60,
    height: STAGE.height + 60,
  },
  floor: { position: 'absolute', left: 24, right: 24, height: 2, borderRadius: 1 },
  shadow: { borderRadius: 999, backgroundColor: 'rgba(28,26,23,0.13)' },
  stamp: {
    zIndex: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 3,
  },
  stampText: { fontFamily: fonts.body, fontWeight: '800', fontSize: 15, letterSpacing: 1.2 },
});
