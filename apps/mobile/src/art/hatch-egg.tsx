import { Canvas, Circle, Group, Oval, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Easing,
  ReduceMotion,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  EGG_BURST_SECONDS,
  EGG_SHAKE_SECONDS,
  EGG_SHARDS,
  eggCrack,
  eggEager,
  eggHop,
  eggRing,
  eggRock,
  eggShard,
} from '@scootch/art';

import { useScreenStyle } from '../ui/use-screen-style';

const ALWAYS = ReduceMotion.Never;
/** The canvas reaches this far past the egg's box on every side, so the shards have room to fly. */
const BLEED = 0.5;
/** The egg in a unit box: its point at the top, its weight low, standing on the bottom edge. */
const EGG =
  'M0.5 0.26 C0.66 0.26 0.76 0.52 0.76 0.68 C0.76 0.86 0.65 0.98 0.5 0.98 C0.35 0.98 0.24 0.86 0.24 0.68 C0.24 0.52 0.34 0.26 0.5 0.26 Z';
const CRACK = 'M0.25 0.66 L0.34 0.58 L0.42 0.68 L0.5 0.57 L0.58 0.67 L0.66 0.58 L0.75 0.65';
const SHARD = 'M-0.07 0.03 L0 -0.07 L0.08 0.04 L0.01 0.07 Z';
const SPECKLES = [
  [0.4, 0.8, 0.022],
  [0.6, 0.86, 0.016],
  [0.62, 0.46, 0.014],
] as const;
/** Where the egg stands and turns about: the middle of its foot. */
const FOOT = { x: 0.5, y: 0.98 } as const;

/** `waiting`: no monster yet. `cracking`: it is here, and the egg gives its last shake. `burst`: out. */
export type EggPhase = 'waiting' | 'cracking' | 'burst';

export interface HatchEggProps {
  /** The side of the monster's own box; the egg stands in the middle of its foot. */
  readonly size: number;
  readonly phase: EggPhase;
  /** Nothing may move: the egg stands there, cracked, and is simply replaced. */
  readonly still?: boolean;
}

function scaled(svg: string, size: number, dx = 0, dy = 0) {
  const path = Skia.Path.MakeFromSVGString(svg);
  if (!path) throw new Error('the egg has a path');
  const matrix = Skia.Matrix();
  matrix.translate(dx, dy);
  matrix.scale(size, size);
  path.transform(matrix);
  return path;
}

/**
 * The egg a task's monster hatches from. It drops in and is alive at once: it rocks, harder the
 * longer it waits, hops every second or so and shows its first crack within one. When the monster
 * is here the cracks run across, it shakes hard, and it bursts: the shell flies apart in pieces
 * with a ring behind them, over the monster popping out. Drawn in one canvas and moved wholly on
 * the UI thread.
 */
export function HatchEgg({ size, phase, still = false }: HatchEggProps) {
  const { palette } = useScreenStyle();
  const pad = size * BLEED;
  const side = size + pad * 2;
  const paths = useMemo(
    () => ({ egg: scaled(EGG, size, pad, pad), crack: scaled(CRACK, size, pad, pad) }),
    [size, pad],
  );
  const shard = useMemo(() => scaled(SHARD, size), [size]);

  /** Seconds since the egg appeared. */
  const clock = useSharedValue(0);
  const dropped = useSharedValue(still ? 1 : 0);
  const shake = useSharedValue(0);
  const split = useSharedValue(still ? 1 : 0);
  const burst = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    clock.value = withTiming(600, {
      duration: 600_000,
      easing: Easing.linear,
      reduceMotion: ALWAYS,
    });
    dropped.value = withTiming(1, {
      duration: 260,
      easing: Easing.out(Easing.back(2.2)),
      reduceMotion: ALWAYS,
    });
  }, [still, clock, dropped]);
  useEffect(() => {
    if (still || phase === 'waiting') return;
    const ms = EGG_SHAKE_SECONDS * 1000;
    shake.value = withTiming(1, { duration: ms, reduceMotion: ALWAYS });
    split.value = withTiming(1, { duration: ms * 0.8, reduceMotion: ALWAYS });
    if (phase === 'burst') {
      burst.value = withTiming(1, {
        duration: EGG_BURST_SECONDS * 1000,
        easing: Easing.linear,
        reduceMotion: ALWAYS,
      });
    }
  }, [still, phase, shake, split, burst]);

  const foot = { x: pad + FOOT.x * size, y: pad + FOOT.y * size };
  const stance = useDerivedValue(() => {
    const t = clock.value;
    const hop = eggHop(t);
    const calm = 1 - shake.value;
    return [
      { translateY: -(1 - dropped.value) * size * 0.35 - hop.lift * size * calm },
      { rotate: (eggRock(t, eggEager(t), shake.value) * Math.PI) / 180 },
      { scaleX: (1 + (hop.squashX - 1) * calm) * (0.9 + 0.1 * dropped.value) },
      { scaleY: 1 + (hop.squashY - 1) * calm },
    ];
  });
  // The shell is gone in the first quarter of the burst; its pieces carry on.
  const whole = useDerivedValue(() => dropped.value * (1 - Math.min(1, burst.value * 4)));
  const cracked = useDerivedValue(() => Math.max(eggCrack(clock.value), split.value));
  const shadow = useDerivedValue(() => 0.14 * whole.value * (1 - eggHop(clock.value).lift * 6));
  const ringRadius = useDerivedValue(() => eggRing(burst.value).radius * size);
  const ringOpacity = useDerivedValue(() => (burst.value > 0 ? eggRing(burst.value).opacity : 0));

  return (
    <Canvas
      pointerEvents="none"
      style={[styles.canvas, { width: side, height: side, left: -pad, top: -pad }]}
    >
      <Oval
        x={foot.x - size * 0.2}
        y={foot.y - size * 0.03}
        width={size * 0.4}
        height={size * 0.06}
        color={palette.ink}
        opacity={shadow}
      />
      <Circle
        cx={pad + size * 0.5}
        cy={pad + size * 0.66}
        r={ringRadius}
        color={palette.tomato}
        style="stroke"
        strokeWidth={size * 0.025}
        opacity={ringOpacity}
      />
      <Group transform={stance} origin={foot} opacity={whole}>
        <Path path={paths.egg} color={palette.risoBlob} />
        <Path path={paths.egg} color={palette.ink} style="stroke" strokeWidth={size * 0.014} />
        <Oval
          x={pad + size * 0.36}
          y={pad + size * 0.38}
          width={size * 0.09}
          height={size * 0.16}
          color="#FFFFFF"
          opacity={0.45}
        />
        {SPECKLES.map(([x, y, r]) => (
          <Circle
            key={`${x}-${y}`}
            cx={pad + x * size}
            cy={pad + y * size}
            r={r * size}
            color={palette.ink}
            opacity={0.22}
          />
        ))}
        <Path
          path={paths.crack}
          color={palette.ink}
          style="stroke"
          strokeWidth={size * 0.016}
          strokeJoin="round"
          strokeCap="round"
          end={cracked}
        />
      </Group>
      {Array.from({ length: EGG_SHARDS }, (_, index) => (
        <Shard
          key={index}
          index={index}
          burst={burst}
          size={size}
          middle={{ x: pad + size * 0.5, y: pad + size * 0.64 }}
          path={shard}
          fill={palette.risoBlob}
          ink={palette.ink}
        />
      ))}
    </Canvas>
  );
}

interface ShardProps {
  readonly index: number;
  readonly burst: SharedValue<number>;
  readonly size: number;
  readonly middle: { readonly x: number; readonly y: number };
  readonly path: ReturnType<typeof scaled>;
  readonly fill: string;
  readonly ink: string;
}

/** One piece of the shell, flying off from the middle of the egg. */
function Shard({ index, burst, size, middle, path, fill, ink }: ShardProps) {
  const flight = useDerivedValue(() => {
    const at = eggShard(index, EGG_SHARDS, burst.value);
    return [
      { translateX: middle.x + at.x * size },
      { translateY: middle.y + at.y * size },
      { rotate: at.turn + index },
    ];
  });
  const opacity = useDerivedValue(() =>
    burst.value > 0 ? eggShard(index, EGG_SHARDS, burst.value).opacity : 0,
  );
  return (
    <Group transform={flight} opacity={opacity}>
      <Path path={path} color={fill} />
      <Path path={path} color={ink} style="stroke" strokeWidth={size * 0.012} strokeJoin="round" />
    </Group>
  );
}

const styles = StyleSheet.create({
  canvas: { position: 'absolute' },
});
