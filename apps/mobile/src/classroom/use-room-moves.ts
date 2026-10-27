import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Easing,
  interpolateColor,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { scheduleOnUI } from 'react-native-worklets';

import { CURVES, LOOPS, TIMING } from '@phusclass/art/class';

import type { ChalkNews } from './layer-view';
import { sampleLoopWorklet } from './loop-worklet';
import { CHALK_DONE_MS, type ChalkLanding } from './moving';

/** The wall, one step warmer per pressure level, 0 to 5, as the App board paints it. */
export const WALL_WARMTH = ['#FFF1DC', '#FFEBD2', '#FFE2C6', '#FFD7BE', '#FFC9B6', '#E8E6EE'];
const STEPS = WALL_WARMTH.map((_, i) => i);

const WALK_EASING = Easing.bezier(...CURVES.walk);
const EASE = Easing.bezier(...CURVES.ease);

/** How far he paces either way on a phone, in room units, and how long he takes to walk it back. */
const PACE_REACH = 160;
const PACE_BACK_MS = 900;

/**
 * His walk to a new spot (`.walkto`): where his middle is, moving 1300 ms on the walk curve, and
 * `walking`, 1 while he walks or paces. His pacing runs on its own clock from the middle of the
 * front: when he stops (to look at you, or at the end of the period) he walks back to the middle
 * from wherever he was, and starts again from there, never jumping. Under Reduce Motion he is
 * simply there.
 */
export function useWalk(
  pivot: readonly [number, number] | undefined,
  pace: boolean,
  mayMove: boolean,
): {
  readonly walkTo: { readonly x: SharedValue<number>; readonly y: SharedValue<number> };
  readonly walking: SharedValue<number>;
  readonly pacing: { readonly on: SharedValue<number>; readonly clock: SharedValue<number> };
} {
  const x = useSharedValue(pivot?.[0] ?? Number.NaN);
  const y = useSharedValue(pivot?.[1] ?? Number.NaN);
  const stepping = useSharedValue(0);
  const pacing = useSharedValue(0);
  const paceClock = useSharedValue(0);
  const paceFrames = useFrameCallback((frame) => {
    paceClock.set(paceClock.get() + (frame.timeSincePreviousFrame ?? 0));
  }, false);
  const last = useRef<readonly [number, number] | null>(null);
  const px = pivot?.[0];
  const py = pivot?.[1];

  useLayoutEffect(() => {
    if (px === undefined || py === undefined) return;
    const before = last.current;
    if (before && before[0] === px && before[1] === py) return;
    last.current = [px, py];
    if (!before || !mayMove) {
      x.set(px);
      y.set(py);
      return;
    }
    const walk = { duration: TIMING.walkToMs, easing: WALK_EASING };
    x.set(withTiming(px, walk));
    y.set(withTiming(py, walk));
    stepping.set(
      withSequence(
        withTiming(1, { duration: 0 }),
        withDelay(TIMING.walkToMs, withTiming(0, { duration: 0 })),
      ),
    );
  }, [px, py, mayMove, x, y, stepping]);

  useLayoutEffect(() => {
    const on = pace && mayMove;
    paceFrames.setActive(on);
    const home = px;
    scheduleOnUI(() => {
      'worklet';
      const was = pacing.get() > 0.5;
      if (on === was) return;
      if (on) {
        paceClock.set(0);
        pacing.set(1);
        return;
      }
      // He stops where he is and walks back to the middle.
      const from = sampleLoopWorklet(LOOPS.paceWide, paceClock.get()).x;
      pacing.set(0);
      if (home === undefined || Number.isNaN(x.get()) || from === 0) return;
      const ms = Math.max(300, (Math.abs(from) / PACE_REACH) * PACE_BACK_MS);
      x.set(home + from);
      x.set(withTiming(home, { duration: ms, easing: WALK_EASING }));
      stepping.set(
        withSequence(withTiming(1, { duration: 0 }), withDelay(ms, withTiming(0, { duration: 0 }))),
      );
    });
  }, [pace, mayMove, px, pacing, paceClock, paceFrames, x, stepping]);

  const walking = useDerivedValue(() => Math.max(stepping.get(), pacing.get()));
  return useMemo(
    () => ({ walkTo: { x, y }, walking, pacing: { on: pacing, clock: paceClock } }),
    [x, y, walking, pacing, paceClock],
  );
}

/** The wall's colour for a pressure, warming over 900 ms as CSS eases a fill; at once under Reduce Motion. */
export function useWall(pressure: number, mayMove: boolean): SharedValue<string> {
  const step = useSharedValue(pressure);
  useLayoutEffect(() => {
    step.set(
      mayMove ? withTiming(pressure, { duration: TIMING.wallWarmMs, easing: EASE }) : pressure,
    );
  }, [pressure, mayMove, step]);
  return useDerivedValue(() => interpolateColor(step.get(), STEPS, WALL_WARMTH));
}

const NO_NEWS: ChalkNews = { fresh: new Set(), more: null, telling: 0 };

/**
 * New chalk: the lines that were not on the board a moment ago write themselves on, and the line
 * under them bumps. Nothing lands on the first drawing of the board, or under Reduce Motion.
 */
export function useChalkLanding(
  lines: readonly string[] | undefined,
  more: string | undefined,
  mayMove: boolean,
): { readonly news: ChalkNews; readonly landing: ChalkLanding } {
  const key = JSON.stringify(lines ?? []);
  const [seen, setSeen] = useState({ key, lines: lines ?? [], news: NO_NEWS });
  let current = seen;
  if (seen.key !== key) {
    const fresh = new Set((lines ?? []).filter((line) => !seen.lines.includes(line)));
    const news =
      mayMove && fresh.size > 0
        ? { fresh, more: more ?? null, telling: seen.news.telling + 1 }
        : { ...NO_NEWS, telling: seen.news.telling };
    current = { key, lines: lines ?? [], news };
    setSeen(current);
  }

  const clock = useSharedValue(CHALK_DONE_MS);
  const playing = useSharedValue(0);
  const telling = current.news.telling;
  const lands = current.news.fresh.size > 0;
  useLayoutEffect(() => {
    if (!lands) return;
    playing.set(telling);
    clock.set(0);
    clock.set(withTiming(CHALK_DONE_MS, { duration: CHALK_DONE_MS, easing: Easing.linear }));
  }, [telling, lands, clock, playing]);

  const landing = useMemo(() => ({ clock, playing }), [clock, playing]);
  return { news: current.news, landing };
}
