import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { MOOD_SQUASH_SECONDS, TAP_REACTION_SECONDS } from '@scootch/art';

/**
 * Seconds since the character last changed, as a value the UI thread runs from zero to the end of
 * the squash whenever `what` changes. It starts settled: a character that has just appeared does
 * not squash. Whether anything may move is the caller's decision (`enabled`), so the animation
 * itself never consults the system setting a second time.
 */
export function useChangeSquash(what: string, enabled: boolean): SharedValue<number> {
  const since = useSharedValue(MOOD_SQUASH_SECONDS);
  const shown = useRef(what);
  useEffect(() => {
    if (shown.current === what) return;
    shown.current = what;
    if (!enabled) return;
    since.value = 0;
    since.value = withTiming(MOOD_SQUASH_SECONDS, {
      duration: MOOD_SQUASH_SECONDS * 1000,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.Never,
    });
    return () => cancelAnimation(since);
  }, [what, enabled, since]);
  return since;
}

/**
 * The reaction to a tap. `press` is what the character's touch handler calls: it tells the screen
 * and, when the character may react, sets `reacting` for the length of the design's reaction. A
 * second tap during a reaction starts it over. Without `onPress` the character cannot be tapped.
 */
export function useTapReaction(
  onPress: (() => void) | undefined,
  mayReact: boolean,
): { reacting: boolean; press: (() => void) | undefined } {
  const [reacting, setReacting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => clear, [clear]);
  // A character that may no longer react stops at once.
  useEffect(() => {
    if (mayReact) return;
    clear();
    setReacting(false);
  }, [mayReact, clear]);

  const press = useCallback(() => {
    onPress?.();
    if (!mayReact) return;
    clear();
    setReacting(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setReacting(false);
    }, TAP_REACTION_SECONDS * 1000);
  }, [onPress, mayReact, clear]);

  return { reacting: reacting && mayReact, press: onPress ? press : undefined };
}
