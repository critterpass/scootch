import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/** One breath in or out. */
const HALF_BREATH_MS = 2400;
const BLINK_EVERY_MS = 4300;
const LID_MS = 60;
const SHUT_MS = 90;

// The same stretch the drawing model gives a full breath (its `bob` motion input).
const BREATH_TALLER = 0.014;
const BREATH_NARROWER = 0.0084;

// Whether anything moves is decided by the caller, from the prop and the system setting, so the
// animations themselves never consult the system setting a second time.
const ALWAYS = ReduceMotion.Never;

export interface ScootchIdle {
  /** Scales the character about its feet: a slow breath. */
  readonly breath: SharedValue<[{ scaleX: number }, { scaleY: number }]>;
  /** 1 while the eyes are open, 0 during a blink. */
  readonly eyesOpen: SharedValue<number>;
  /** 1 during a blink, 0 otherwise. */
  readonly eyesShut: SharedValue<number>;
}

/**
 * The idle that keeps Scootch alive: a slow breath and a blink now and then, run on the UI thread.
 * With `moving` false every value rests and nothing is scheduled.
 */
export function useScootchIdle(moving: boolean): ScootchIdle {
  const bob = useSharedValue(0);
  const blink = useSharedValue(0);

  useEffect(() => {
    if (!moving) return;
    bob.value = -1;
    bob.value = withRepeat(
      withTiming(1, {
        duration: HALF_BREATH_MS,
        easing: Easing.inOut(Easing.sin),
        reduceMotion: ALWAYS,
      }),
      -1,
      true,
      undefined,
      ALWAYS,
    );
    blink.value = withRepeat(
      withSequence(
        ALWAYS,
        withDelay(
          BLINK_EVERY_MS,
          withTiming(1, { duration: LID_MS, reduceMotion: ALWAYS }),
          ALWAYS,
        ),
        withDelay(SHUT_MS, withTiming(0, { duration: LID_MS, reduceMotion: ALWAYS }), ALWAYS),
      ),
      -1,
      false,
      undefined,
      ALWAYS,
    );
    return () => {
      cancelAnimation(bob);
      cancelAnimation(blink);
      bob.value = 0;
      blink.value = 0;
    };
  }, [moving, bob, blink]);

  const breath = useDerivedValue<[{ scaleX: number }, { scaleY: number }]>(() => [
    { scaleX: 1 - bob.value * BREATH_NARROWER },
    { scaleY: 1 + bob.value * BREATH_TALLER },
  ]);
  // The two eye layers swap rather than fade: both hold see-through ink that would double up.
  const eyesShut = useDerivedValue<number>(() => (blink.value > 0.5 ? 1 : 0));
  const eyesOpen = useDerivedValue<number>(() => 1 - eyesShut.value);

  return { breath, eyesOpen, eyesShut };
}
