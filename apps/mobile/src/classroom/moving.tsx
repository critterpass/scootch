import { BlendColor, Group, Paint, vec } from '@shopify/react-native-skia';
import type { ReactElement } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { CURVES, type Loop } from '@phusclass/art/class';

import { easeWorklet, REST, sampleLoopWorklet } from './loop-worklet';

/**
 * The classroom's moving groups. Every one reads shared values on the UI thread, so a frame never
 * waits for JavaScript and a change of what moves never re-renders the room.
 */

/**
 * A layer that moves: its loop, sampled each frame about its pivot. With `walking`, it runs
 * `walkLoop` instead while he walks or paces (his body bobs where it would breathe; his feet step).
 */
export function Moving({
  loop,
  walkLoop,
  walking,
  pivot,
  clock,
  children,
}: {
  readonly loop: Loop | undefined;
  readonly walkLoop?: Loop | undefined;
  readonly walking?: SharedValue<number> | undefined;
  readonly pivot: readonly [number, number];
  readonly clock: SharedValue<number>;
  readonly children: ReactElement;
}) {
  const values = useDerivedValue(() => {
    const now = walkLoop && walking && walking.get() > 0.5 ? walkLoop : loop;
    return now ? sampleLoopWorklet(now, clock.get()) : REST;
  });
  const transform = useDerivedValue(() => {
    const v = values.get();
    return [
      { translateX: v.x },
      { translateY: v.y },
      { rotate: (v.rotate * Math.PI) / 180 },
      { scaleX: v.scaleX },
      { scaleY: v.scaleY },
    ];
  });
  const opacity = useDerivedValue(() => values.get().opacity);
  const fades = [loop, walkLoop].some((l) => l?.frames.some((f) => f.opacity !== undefined));
  return (
    <Group
      transform={transform}
      origin={vec(pivot[0], pivot[1])}
      {...(fades ? { layer: <Paint opacity={opacity} /> } : {})}
    >
      {children}
    </Group>
  );
}

/** His eyes, open or shut by the blink value. */
export function Blinking({
  open,
  shut,
  blink,
}: {
  readonly open: ReactElement;
  readonly shut: ReactElement;
  readonly blink: SharedValue<number>;
}) {
  const openOpacity = useDerivedValue(() => 1 - blink.get());
  return (
    <>
      <Group layer={<Paint opacity={openOpacity} />}>{open}</Group>
      <Group layer={<Paint opacity={blink} />}>{shut}</Group>
    </>
  );
}

/**
 * Him on his way to a new spot. `at` is where his middle is now, in room units, and `pivot` where
 * this drawing of him has it: whichever of the two reaches the screen first, he is drawn where he
 * is, never a frame at the new spot before he walks there.
 */
export function Walking({
  at,
  pivot,
  children,
}: {
  readonly at: { readonly x: SharedValue<number>; readonly y: SharedValue<number> };
  readonly pivot: readonly [number, number];
  readonly children: ReactElement;
}) {
  // Before he has a spot at all, he is where this drawing puts him.
  const transform = useDerivedValue(() => {
    const x = at.x.get();
    const y = at.y.get();
    return Number.isNaN(x) || Number.isNaN(y)
      ? [{ translateX: 0 }, { translateY: 0 }]
      : [{ translateX: x - pivot[0] }, { translateY: y - pivot[1] }];
  });
  return <Group transform={transform}>{children}</Group>;
}

/** The wall, painted the colour the pressure has warmed it to. */
export function WallTint({
  color,
  children,
}: {
  readonly color: SharedValue<string>;
  readonly children: ReactElement;
}) {
  return (
    <Group
      layer={
        <Paint>
          <BlendColor color={color} mode="srcIn" />
        </Paint>
      }
    >
      {children}
    </Group>
  );
}

/** New chalk: it writes on from the left, 720 ms on the ink curve after 620 ms (`.wA`). */
export const WRITE = { delayMs: 620, ms: 720 } as const;
/** The line under the chalk bumps as the new lines land (`.bumpA`). */
const BUMP: Loop = {
  periodMs: 420,
  curve: CURVES.character,
  frames: [
    { at: 0, scaleX: 1, scaleY: 1 },
    { at: 0.4, scaleX: 1.3, scaleY: 1.3 },
    { at: 1, scaleX: 1, scaleY: 1 },
  ],
};
const BUMP_DELAY_MS = 600;
/** Where the chalk's clock rests once everything has landed. */
export const CHALK_DONE_MS = WRITE.delayMs + WRITE.ms;

/** What the chalk does as it lands: its clock, and which telling of it is playing. */
export interface ChalkLanding {
  readonly clock: SharedValue<number>;
  readonly playing: SharedValue<number>;
}

/**
 * One chalk line landing. `telling` is the telling this line came with: until that telling plays,
 * a written line stays unwritten, so it never shows whole for a frame before it writes itself on.
 */
export function Landing({
  how,
  landing,
  telling,
  box,
  children,
}: {
  readonly how: 'write' | 'bump';
  readonly landing: ChalkLanding;
  readonly telling: number;
  readonly box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly children: ReactElement;
}) {
  const clip = useDerivedValue(() => {
    const ours = landing.playing.get() === telling;
    const t = Math.min(1, Math.max(0, (landing.clock.get() - WRITE.delayMs) / WRITE.ms));
    const shown = ours ? easeWorklet(CURVES.ink, t) : 0;
    return { x: box.x, y: box.y, width: box.width * shown, height: box.height };
  });
  const transform = useDerivedValue(() => {
    const ours = landing.playing.get() === telling;
    const ms = Math.min(BUMP.periodMs - 0.01, Math.max(0, landing.clock.get() - BUMP_DELAY_MS));
    const k = ours ? sampleLoopWorklet(BUMP, ms).scaleX : 1;
    return [{ scale: k }];
  });
  if (how === 'write') return <Group clip={clip}>{children}</Group>;
  return (
    <Group transform={transform} origin={vec(box.x + box.width / 2, box.y + box.height / 2)}>
      {children}
    </Group>
  );
}
