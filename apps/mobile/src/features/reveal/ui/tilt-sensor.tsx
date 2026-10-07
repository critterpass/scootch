import { useEffect } from 'react';
import {
  SensorType,
  useAnimatedReaction,
  useAnimatedSensor,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

/** How far the phone's tilt may lean the card, in degrees. */
const MAX = { x: 11, y: 13 } as const;
/** This much change in gravity along an axis, in metres a second squared, is the full lean. */
const FULL_LEAN = 4;
/** The phone is read thirty times a second: the card eases between readings on its own loop. */
const READ_EVERY_MS = 33;
/**
 * How long "level" takes to follow the way the phone is being held, in milliseconds: the card
 * leans when the phone moves and comes back to rest in a couple of seconds, however the person
 * holds it. It is a time, not a share per reading, so it is the same at any reading rate.
 */
const LEVEL_FOLLOWS_MS = 1400;

const clamp = (value: number): number => {
  'worklet';
  return Math.min(1, Math.max(-1, value));
};

/**
 * Reads the phone's tilt from gravity and writes it, in degrees, into `into`. It draws nothing.
 * Mount it only while the card's motion says it is sensing (it may move, its screen is in front
 * and the app is open): unmounted, the sensor is off and the card is level again.
 */
export function TiltSensor({ into }: { readonly into: SharedValue<{ x: number; y: number }> }) {
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: READ_EVERY_MS });
  const level = useSharedValue<{ x: number; y: number; at: number } | null>(null);

  useAnimatedReaction(
    () => gravity.sensor.value,
    (now) => {
      'worklet';
      const at = Date.now();
      const before = level.value ?? { x: now.x, y: now.y, at };
      const follows = 1 - Math.exp(-Math.min(500, at - before.at) / LEVEL_FOLLOWS_MS);
      const next = {
        x: before.x + (now.x - before.x) * follows,
        y: before.y + (now.y - before.y) * follows,
        at,
      };
      level.value = next;
      into.value = {
        // Tipping the top of the phone away leans the card about its horizontal axis; rolling it
        // to a side leans it about its vertical one.
        x: clamp((now.y - next.y) / FULL_LEAN) * MAX.x,
        y: clamp((now.x - next.x) / FULL_LEAN) * MAX.y,
      };
    },
  );

  useEffect(
    () => () => {
      into.value = { x: 0, y: 0 };
    },
    [into],
  );
  return null;
}
