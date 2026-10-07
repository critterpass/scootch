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
/**
 * How fast "level" follows the way the phone is being held: the card leans when the phone moves
 * and comes back to rest in a couple of seconds, however the person holds it.
 */
const LEVEL_FOLLOWS = 0.012;

const clamp = (value: number): number => {
  'worklet';
  return Math.min(1, Math.max(-1, value));
};

/**
 * Reads the phone's tilt from gravity and writes it, in degrees, into `into`. It draws nothing.
 * Mount it only while the card is on a focused screen and may move: unmounted, the sensor is off
 * and the card is level again.
 */
export function TiltSensor({ into }: { readonly into: SharedValue<{ x: number; y: number }> }) {
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: 'auto' });
  const level = useSharedValue<{ x: number; y: number } | null>(null);

  useAnimatedReaction(
    () => gravity.sensor.value,
    (now) => {
      'worklet';
      const before = level.value ?? { x: now.x, y: now.y };
      const next = {
        x: before.x + (now.x - before.x) * LEVEL_FOLLOWS,
        y: before.y + (now.y - before.y) * LEVEL_FOLLOWS,
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
