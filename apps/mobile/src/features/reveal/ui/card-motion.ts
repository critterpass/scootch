import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import {
  useSimultaneousGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import {
  useFrameCallback,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/**
 * The board's card in the hand (`[data-tilt]`): it sways by five and nine degrees when left
 * alone, leans up to eleven and thirteen towards a finger, and eases a little over a tenth of
 * the way there each frame. The phone's own tilt is added to both.
 */
export const TILT = {
  swayX: 5,
  swayY: 9,
  swayXSpeed: 0.9,
  swayYSpeed: 0.6,
  dragX: 22,
  dragY: 26,
  ease: 0.12,
  heldScale: 1.02,
  /** A sideways flick faster than this, in points a second, turns the card over. */
  flingSpeed: 650,
} as const;

/** Letting go of the card: it settles with one soft overshoot. */
const SETTLE = { damping: 14, stiffness: 160, mass: 0.9 } as const;
const TURN = { damping: 15, stiffness: 110, mass: 1 } as const;

export interface CardMotion {
  /** The lean about the horizontal and the vertical axis, in degrees, without the flip. */
  readonly rx: SharedValue<number>;
  readonly ry: SharedValue<number>;
  /** How far the card is turned over, in degrees: 0 is face up, 180 is its back. */
  readonly flip: SharedValue<number>;
  readonly scale: SharedValue<number>;
  /** The phone's tilt, in degrees, written by the tilt sensor while it is mounted. */
  readonly phone: SharedValue<{ x: number; y: number }>;
  /** Seconds since the card appeared, for anything that sweeps by itself. */
  readonly clock: SharedValue<number>;
  /** Turns the card over, for a control that is not the card itself. */
  readonly turnOver: () => void;
  readonly gesture: ReturnType<typeof useSimultaneousGestures>;
}

export interface CardMotionOptions {
  /** False holds the card flat and still: no sway, no lean, and a turn is a plain swap. */
  readonly mayMove: boolean;
  /** False takes the card out of the hand: it sways and follows the phone, and answers no touch. */
  readonly handled: boolean;
  /** The card's size on screen, for reading where a finger is on it. */
  readonly width: number;
  readonly height: number;
  /** Called on the JS thread each time the card is turned over by hand. */
  readonly onTurn?: () => void;
}

const clampHalf = (value: number): number => {
  'worklet';
  return Math.min(0.5, Math.max(-0.5, value));
};

/** Everything that moves a card, on the UI thread: the sway, the finger, the phone and the flip. */
export function useCardMotion(options: CardMotionOptions): CardMotion {
  const { mayMove, handled, width, height, onTurn } = options;
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const flip = useSharedValue(0);
  const scale = useSharedValue(1);
  const phone = useSharedValue({ x: 0, y: 0 });
  const clock = useSharedValue(0);
  const held = useSharedValue(false);
  const finger = useSharedValue({ x: 0, y: 0 });
  /** Which way up the card is meant to be, counted in half turns. */
  const side = useSharedValue(0);

  // Nothing is worked out for a card nobody can see: the loop stops with the screen's focus.
  const focused = useIsFocused();
  const loop = useFrameCallback((frame) => {
    'worklet';
    const seconds = frame.timeSinceFirstFrame / 1000;
    clock.value = seconds;
    const tilt = phone.value;
    const tx = held.value
      ? -finger.value.y * TILT.dragX + tilt.x
      : Math.sin(seconds * TILT.swayXSpeed) * TILT.swayX + tilt.x;
    const ty = held.value
      ? finger.value.x * TILT.dragY + tilt.y
      : Math.sin(seconds * TILT.swayYSpeed) * TILT.swayY + tilt.y;
    // The board eases by a fixed share per frame at sixty frames a second; a slower or faster
    // display covers the same ground in the same time.
    const frames = Math.min(4, (frame.timeSincePreviousFrame ?? 16.7) / 16.7);
    const share = 1 - Math.pow(1 - TILT.ease, frames);
    rx.value += (tx - rx.value) * share;
    ry.value += (ty - ry.value) * share;
  }, false);

  useEffect(() => {
    loop.setActive(mayMove && focused);
  }, [loop, mayMove, focused]);
  useEffect(() => {
    if (mayMove) return;
    rx.value = 0;
    ry.value = 0;
    scale.value = 1;
  }, [mayMove, rx, ry, scale]);

  const turned = () => onTurn?.();
  const turn = (direction: number) => {
    'worklet';
    side.value += direction;
    const to = side.value * 180;
    flip.value = mayMove ? withSpring(to, TURN) : withTiming(to, { duration: 0 });
    scheduleOnRN(turned);
  };

  const tap = useTapGesture({
    enabled: handled,
    maxDuration: 280,
    maxDistance: 8,
    onActivate: () => {
      'worklet';
      turn(1);
    },
  });
  const pan = usePanGesture({
    enabled: handled,
    minDistance: 6,
    onBegin: (event) => {
      'worklet';
      if (!mayMove) return;
      held.value = true;
      finger.value = { x: clampHalf(event.x / width - 0.5), y: clampHalf(event.y / height - 0.5) };
      scale.value = withSpring(TILT.heldScale, SETTLE);
    },
    onUpdate: (event) => {
      'worklet';
      finger.value = { x: clampHalf(event.x / width - 0.5), y: clampHalf(event.y / height - 0.5) };
    },
    onDeactivate: (event) => {
      'worklet';
      if (event.canceled) return;
      const sideways = Math.abs(event.velocityX) > Math.abs(event.velocityY) * 1.5;
      if (sideways && Math.abs(event.velocityX) > TILT.flingSpeed) {
        turn(event.velocityX > 0 ? 1 : -1);
      }
    },
    onFinalize: () => {
      'worklet';
      held.value = false;
      scale.value = withSpring(1, SETTLE);
    },
  });
  const gesture = useSimultaneousGestures(tap, pan);

  return {
    rx,
    ry,
    flip,
    scale,
    phone,
    clock,
    turnOver: () => {
      side.value += 1;
      const to = side.value * 180;
      flip.value = mayMove ? withSpring(to, TURN) : withTiming(to, { duration: 0 });
    },
    gesture,
  };
}
