import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { SessionEvent } from '@scootch/domain';

import type { AnimatedViewStyle } from '../../../ui/motion/animated-style';

import type { Caption, CaptionName } from './captions';
import type { CatchStage } from './catch-flow';
import type { Buzz, SceneHost } from './rig';

/** How long what the person just did keeps the caption before how things stand is back. */
const REACTION_MS = 1800;

function buzz(weight: Buzz): void {
  const done =
    weight === 'tick'
      ? Haptics.selectionAsync()
      : Haptics.impactAsync(
          weight === 'heavy'
            ? Haptics.ImpactFeedbackStyle.Heavy
            : weight === 'medium'
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light,
        );
  void done.catch(() => undefined);
}

export interface SceneHostInput {
  readonly stage: CatchStage;
  readonly haptics: boolean;
  readonly playCue: (cue: string) => void;
  readonly sendFinish: (event: SessionEvent) => Promise<void>;
}

export interface SceneHostHandle {
  readonly host: SceneHost;
  /** How things stand, as the scene last said it. */
  readonly status: Caption | null;
  /** What the person just did, for a moment. */
  readonly reaction: Caption | null;
  /** The catch's own word, once it has landed. */
  readonly won: CaptionName | null;
  /** Moves the whole drawing while a slam jolts it. */
  readonly joltStyle: AnimatedViewStyle;
}

/**
 * What a catch scene is given to speak and act through: its captions are kept here, its sounds and
 * taps obey the person's switches, a slam jolts the drawing, and the finish is sent once.
 */
export function useSceneHost(input: SceneHostInput): SceneHostHandle {
  const [status, setStatus] = useState<Caption | null>(null);
  const [reaction, setReaction] = useState<Caption | null>(null);
  const [won, setWon] = useState<CaptionName | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const react = useCallback((caption: Caption) => {
    if (timer.current) clearTimeout(timer.current);
    setReaction(caption);
    timer.current = setTimeout(() => setReaction(null), REACTION_MS);
  }, []);
  // A reaction belongs to the stage it was made in.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setReaction(null);
  }, [input.stage]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const jolt = useSharedValue(0);
  const joltSize = useSharedValue(0);
  const joltStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -jolt.value * joltSize.value * 0.6 },
      { translateY: jolt.value * joltSize.value },
    ],
  }));

  const sent = useRef(false);
  const latest = useRef(input);
  latest.current = input;
  const host = useMemo<SceneHost>(
    () => ({
      status: setStatus,
      react,
      early: () => react({ name: 'early' }),
      cue: (cue) => latest.current.playCue(cue),
      buzz: (weight) => {
        if (latest.current.haptics) buzz(weight);
      },
      shake: (amount) => {
        joltSize.value = amount;
        jolt.value = withSequence(
          withTiming(1, { duration: 60 }),
          withTiming(-0.5, { duration: 80 }),
          withTiming(0.3, { duration: 80 }),
          withTiming(0, { duration: 80 }),
        );
      },
      landed: () => {
        if (sent.current) return;
        sent.current = true;
        void latest.current.sendFinish({ type: 'caught' });
      },
      won: setWon,
      sendFinish: (event) => latest.current.sendFinish(event),
    }),
    [react, jolt, joltSize],
  );

  return { host, status, reaction, won, joltStyle: joltStyle };
}
