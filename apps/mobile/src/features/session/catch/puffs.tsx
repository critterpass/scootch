import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

interface Speck {
  readonly id: number;
  readonly vx: number;
  readonly vy: number;
  readonly gravity: number;
  readonly size: number;
  readonly grow: number;
  readonly color: string;
}

interface Puff {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly life: number;
  readonly specks: readonly Speck[];
}

export interface PuffOptions {
  readonly count: number;
  readonly colors: readonly string[];
  /** The way it is thrown, in radians, and how wide. Left out, it goes every way. */
  readonly angle?: number;
  readonly spread?: number;
  readonly speed: number;
  /** How hard it falls; negative drifts up, as dust does. */
  readonly gravity: number;
  readonly life: number;
  readonly size?: number;
  /** Dust swells as it thins; a splash does not. */
  readonly swells?: boolean;
}

export interface PuffsHandle {
  /** Throws one puff from a point of the board. */
  readonly fire: (x: number, y: number, options: PuffOptions) => void;
}

function SpeckView({
  speck,
  clock,
}: {
  readonly speck: Speck;
  readonly clock: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const k = clock.value;
    const eased = 1 - Math.pow(1 - k, 3);
    return {
      opacity: k > 0.6 ? (1 - k) / 0.4 : 1,
      transform: [
        { translateX: speck.vx * eased },
        { translateY: speck.vy * eased + speck.gravity * k * k },
        { scale: 1 + k * speck.grow },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.at,
        {
          width: speck.size * 2,
          height: speck.size * 2,
          borderRadius: speck.size,
          marginLeft: -speck.size,
          marginTop: -speck.size,
          backgroundColor: speck.color,
        },
        style,
      ]}
    />
  );
}

function PuffView({ puff }: { readonly puff: Puff }) {
  const clock = useSharedValue(0);
  useEffect(() => {
    clock.value = withTiming(1, { duration: puff.life, easing: Easing.linear });
  }, [clock, puff.life]);
  return (
    <View style={[styles.at, { left: puff.x, top: puff.y }]}>
      {puff.specks.map((speck) => (
        <SpeckView key={speck.id} speck={speck} clock={clock} />
      ))}
    </View>
  );
}

/** The small things a catch throws up: dust from a slam, a splash, the pop of a bubble. */
export const Puffs = forwardRef<PuffsHandle>(function Puffs(_, ref) {
  const [puffs, setPuffs] = useState<readonly Puff[]>([]);
  useImperativeHandle(
    ref,
    () => ({
      fire: (x, y, options) => {
        const id = Date.now() + Math.random();
        const specks = Array.from({ length: options.count }, (_unused, index): Speck => {
          const angle =
            options.angle === undefined
              ? Math.random() * Math.PI * 2
              : options.angle + (Math.random() - 0.5) * (options.spread ?? 1);
          const speed = options.speed * (0.4 + Math.random() * 0.8);
          return {
            id: index,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: options.gravity,
            size: options.size ?? 2.5 + Math.random() * 3,
            grow: options.swells ? 1.6 : 0,
            color: options.colors[index % options.colors.length] ?? '#E2D9CA',
          };
        });
        setPuffs((before) => [...before, { id, x, y, life: options.life, specks }]);
        setTimeout(
          () => setPuffs((before) => before.filter((puff) => puff.id !== id)),
          options.life + 80,
        );
      },
    }),
    [],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {puffs.map((puff) => (
        <PuffView key={puff.id} puff={puff} />
      ))}
    </View>
  );
});

/**
 * The dust a slam throws out along the floor, to one side. It is a shade off the page it rises
 * from, darker on paper and lighter in the dark, so it is seen on both.
 */
export const dust = (dark: boolean) =>
  ({
    count: 10,
    colors: dark ? ['#5A5248', '#4A433B'] : ['#CFC2AD', '#BFB29B'],
    spread: 0.7,
    speed: 90,
    gravity: -50,
    size: 6,
    life: 700,
    swells: true,
  }) satisfies Omit<PuffOptions, 'angle'>;

const styles = StyleSheet.create({
  at: { position: 'absolute' },
});
