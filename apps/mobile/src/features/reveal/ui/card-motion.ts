import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  usePanGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import {
  useAnimatedReaction,
  useFrameCallback,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { liveliness, turnedBy } from './card-turn';
import { useAppActive } from './use-app-active';

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
  /** A finger has to travel this far before the card takes the drag as its own. */
  takesAfter: 8,
  /** A drag beside a scrolling page that goes this far up or down is the page's. */
  scrollsAfter: 14,
  /** The strip along each side of the screen the card never answers: the swipe back starts there. */
  freeEdge: 20,
  /** Left alone this long, in seconds, the sway fades out over the next two and the card rests. */
  restAfter: 6,
  restFade: 2,
  /** The phone has moved when its tilt leans the card by more than this, in degrees. */
  stirs: 0.8,
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
  /** Seconds the card has been moving, for anything that sweeps by itself. */
  readonly clock: SharedValue<number>;
  /** How lively the card is, 0 at rest to 1: what moves by itself is scaled by it. */
  readonly lively: SharedValue<number>;
  /**
   * Whether the phone's tilt should be read: the card may move, its screen is in front and the
   * app is open. The one answer the card and its sensor share.
   */
  readonly sensing: boolean;
  /** Turns the card over, for a control that is not the card itself. */
  readonly turnOver: () => void;
  readonly gesture: ReturnType<typeof useSimultaneousGestures>;
}

export interface CardMotionOptions {
  /** False holds the card flat and still: no sway, no lean, and a turn is a plain swap. */
  readonly mayMove: boolean;
  /** False takes the card out of the hand: it sways and follows the phone, and answers no touch. */
  readonly handled: boolean;
  /** The card's canvas on screen, centred across it, for reading where a finger is on it. */
  readonly width: number;
  readonly height: number;
  /**
   * True where the card sits in a page that scrolls: a drag up or down is then the page's, and
   * the card takes sideways drags only.
   */
  readonly besideScroll?: boolean;
  /** Where the card starts, for one that arrives turned over. Face up at full size when left out. */
  readonly startsAt?: { readonly flip: number; readonly scale: number };
}

const clampHalf = (value: number): number => {
  'worklet';
  return Math.min(0.5, Math.max(-0.5, value));
};

/** Everything that moves a card, on the UI thread: the sway, the finger, the phone and the flip. */
export function useCardMotion(options: CardMotionOptions): CardMotion {
  const { mayMove, handled, width, height, besideScroll = false } = options;
  const screen = useWindowDimensions();
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const flip = useSharedValue(options.startsAt?.flip ?? 0);
  const scale = useSharedValue(options.startsAt?.scale ?? 1);
  const phone = useSharedValue({ x: 0, y: 0 });
  const clock = useSharedValue(0);
  const lively = useSharedValue(1);
  const held = useSharedValue(false);
  const finger = useSharedValue({ x: 0, y: 0 });
  /** Which way up the card is meant to be, counted in half turns. */
  const side = useSharedValue(0);
  /** The clock's reading when the card was last touched or the phone last moved. */
  const activeAt = useSharedValue(0);

  // Nothing is worked out for a card nobody can see, or for one that has come to rest: the loop
  // stops with the screen's focus, with the app going to the background, and with the sway.
  const focused = useIsFocused();
  const appActive = useAppActive();
  const [resting, setResting] = useState(false);
  const inFront = mayMove && focused && appActive;

  const loop = useFrameCallback((frame) => {
    'worklet';
    // The clock only runs while the loop does, so a card that wakes carries on where it stopped.
    const step = Math.min(100, frame.timeSincePreviousFrame ?? 16.7);
    clock.value += step / 1000;
    const seconds = clock.value;
    const tilt = phone.value;
    const stirred = Math.abs(tilt.x) + Math.abs(tilt.y) > TILT.stirs;
    if (held.value || stirred) activeAt.value = seconds;
    const alive = liveliness(seconds - activeAt.value, TILT.restAfter, TILT.restFade);
    lively.value = alive;
    const tx = held.value
      ? -finger.value.y * TILT.dragX + tilt.x
      : Math.sin(seconds * TILT.swayXSpeed) * TILT.swayX * alive + tilt.x;
    const ty = held.value
      ? finger.value.x * TILT.dragY + tilt.y
      : Math.sin(seconds * TILT.swayYSpeed) * TILT.swayY * alive + tilt.y;
    // The board eases by a fixed share per frame at sixty frames a second; a slower or faster
    // display covers the same ground in the same time.
    const share = 1 - Math.pow(1 - TILT.ease, step / 16.7);
    rx.value += (tx - rx.value) * share;
    ry.value += (ty - ry.value) * share;
    // Flat, still and left alone: there is nothing more to draw until something moves.
    if (alive === 0 && Math.abs(rx.value - tx) < 0.02 && Math.abs(ry.value - ty) < 0.02) {
      scheduleOnRN(setResting, true);
    }
  }, false);

  useEffect(() => {
    loop.setActive(inFront && !resting);
  }, [loop, inFront, resting]);
  useEffect(() => {
    if (mayMove) return;
    rx.value = 0;
    ry.value = 0;
  }, [mayMove, rx, ry]);

  // A touch or a tilt of the phone wakes a resting card.
  const wake = () => setResting(false);
  useAnimatedReaction(
    () => held.value || Math.abs(phone.value.x) + Math.abs(phone.value.y) > TILT.stirs,
    (active, was) => {
      if (active && !was) {
        activeAt.value = clock.value;
        scheduleOnRN(wake);
      }
    },
  );

  const turn = (direction: number) => {
    'worklet';
    const next = turnedBy(side.value, direction);
    side.value = next.side;
    flip.value = mayMove
      ? withSpring(next.degrees, TURN)
      : withTiming(next.degrees, { duration: 0 });
  };

  // The card's canvas is centred across the screen; whatever of it lies in the strip along either
  // side is left to the system's swipe back.
  const outside = Math.max(0, (screen.width - width) / 2);
  const kept = Math.max(0, TILT.freeEdge - outside);
  const hitSlop = { left: -kept, right: -kept };

  const tap = useTapGesture({
    enabled: handled,
    hitSlop,
    maxDuration: 280,
    maxDistance: 8,
    onActivate: () => {
      'worklet';
      turn(1);
    },
  });
  const pan = usePanGesture({
    enabled: handled,
    hitSlop,
    // The card takes a drag only once it is clearly one: a touch that has not moved is still the
    // system's or the page's to claim.
    activeOffsetX: [-TILT.takesAfter, TILT.takesAfter],
    ...(besideScroll
      ? { failOffsetY: [-TILT.scrollsAfter, TILT.scrollsAfter] as [number, number] }
      : { activeOffsetY: [-TILT.takesAfter, TILT.takesAfter] as [number, number] }),
    onActivate: (event) => {
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
    lively,
    sensing: inFront,
    // The side is counted on the UI thread, where the card's own tap counts it: read and written
    // in one place, a press is never a turn behind.
    turnOver: () => scheduleOnUI(turn, 1),
    gesture,
  };
}
