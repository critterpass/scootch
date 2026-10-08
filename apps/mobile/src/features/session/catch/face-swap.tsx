import { useCallback, useEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { StyleSheet, type View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Monster } from '../../../art/Monster';
import { Scootch, type ScootchProps } from '../../../art/Scootch';
import type { AnimatedViewStyle } from '../../../ui/motion/animated-style';
import { FLIP_CURVE } from '../../../ui/motion/motion-tokens';
import type { SessionFace, SessionModel } from '../screens/screen-props';

/** How long the two take to change places. */
export const SWAP_MS = 680;
/** How long a swap may take before the screen stops waiting for it and simply shows the other. */
const GIVE_UP_AFTER_MS = SWAP_MS + 900;
/** How far each bows out of the straight line between the corner and the middle, in points. */
const SCOOTCH_BOW = 26;
const MONSTER_BOW = 46;
/** How much each grows at the top of its flight. */
const STRETCH = 0.08;
/** The largest the flying monster is drawn; it is scaled from there. */
const MONSTER_DRAWN = 200;

type ViewRef = ComponentRef<typeof View>;

/** A square on the screen: its middle and its side, in points from the screen's top left. */
export interface Place {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

/** Where the two fly between: the corner, the middle of the catch, and Scootch's disc. */
export interface Flight {
  readonly corner: Place;
  readonly scene: Place;
  readonly desk: Place;
}

export interface FaceSwapInput {
  readonly opensOn: SessionFace;
  /** Nothing may move: the two simply change places. */
  readonly still: boolean;
  /** Where the corner and the middle of the catch are; `null` until the screen is laid out. */
  readonly places: () => Pick<Flight, 'corner' | 'scene'> | null;
}

export interface FaceSwap {
  /** Who the screen is about, at rest. */
  readonly face: SessionFace;
  /** Who it is turning to, while the two change places; `null` at rest. */
  readonly pending: SessionFace | null;
  /** 0 with the monster and its catch on the screen, 1 with Scootch at work. */
  readonly turn: SharedValue<number>;
  /** The two are in the air between their places, drawn by `SwapFlyers`. */
  readonly flight: Flight | null;
  /** They have left: whoever rests in the corner and on the disc is not drawn until they land. */
  readonly flying: boolean;
  readonly rootRef: RefObject<ViewRef | null>;
  /** Scootch's place on his disc. */
  readonly deskRef: RefObject<ViewRef | null>;
  readonly swap: () => void;
}

/**
 * The swap between the session's two faces. The monster's catch fills the screen with Scootch
 * small in the corner, or Scootch works on his disc with the monster in the corner; a tap on the
 * corner makes them change places.
 *
 * Both faces are drawn for the length of the swap. The screen is laid out first, so that where
 * Scootch sits on his disc is known; the two flyers are then put exactly over whoever they stand
 * in for, and only once they are drawn do the ones at rest step out and the flight begin. When it
 * lands the ones at rest are already drawn under the flyers, so nothing blinks at either end.
 */
export function useFaceSwap(input: FaceSwapInput): FaceSwap {
  const [face, setFace] = useState<SessionFace>(input.opensOn);
  const [pending, setPending] = useState<SessionFace | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [flying, setFlying] = useState(false);
  const turn = useSharedValue(input.opensOn === 'scootch' ? 1 : 0);
  const rootRef = useRef<ViewRef>(null);
  const deskRef = useRef<ViewRef>(null);
  const latest = useRef(input);
  latest.current = input;
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const settle = useCallback(
    (to: SessionFace) => {
      if (!alive.current) return;
      turn.value = to === 'scootch' ? 1 : 0;
      setFace(to);
      setPending(null);
      setFlight(null);
      setFlying(false);
    },
    [turn],
  );

  const swap = useCallback(() => {
    if (pending !== null) return;
    const to: SessionFace = face === 'monster' ? 'scootch' : 'monster';
    if (latest.current.still) settle(to);
    else setPending(to);
  }, [face, pending, settle]);

  useEffect(() => {
    if (pending === null) return undefined;
    let dropped = false;
    const after = (frames: number, then: () => void) => {
      if (dropped) return;
      if (frames === 0) then();
      else requestAnimationFrame(() => after(frames - 1, then));
    };
    const leave = () => {
      setFlying(true);
      turn.value = withTiming(
        pending === 'scootch' ? 1 : 0,
        { duration: SWAP_MS, easing: FLIP_CURVE, reduceMotion: ReduceMotion.Never },
        (finished) => {
          if (finished) runOnJS(settle)(pending);
        },
      );
    };
    // Two frames for the face that has just been drawn to be laid out, then where Scootch sits.
    after(2, () => {
      const places = latest.current.places();
      const root = rootRef.current;
      const desk = deskRef.current;
      // With nowhere to fly between, the two faces still fade into each other.
      if (!places || !root || !desk) return leave();
      root.measureInWindow((rootX, rootY) =>
        desk.measureInWindow((x, y, width, height) => {
          if (dropped) return;
          if (!(width > 0)) return leave();
          setFlight({
            ...places,
            desk: { x: x - rootX + width / 2, y: y - rootY + height / 2, size: width },
          });
          // The flyers are given three frames to be drawn before anyone steps out from under them.
          after(3, leave);
        }),
      );
    });
    const giveUp = setTimeout(() => settle(pending), GIVE_UP_AFTER_MS);
    return () => {
      dropped = true;
      clearTimeout(giveUp);
    };
  }, [pending, settle, turn]);

  return { face, pending, turn, flight, flying, rootRef, deskRef, swap };
}

/**
 * How each face comes and goes as the two change places. The catch sinks back and is gone by
 * half way; Scootch's desk rises in from there and lands with the smallest overshoot, as he does.
 */
export function useSwapLayers(turn: SharedValue<number>): {
  readonly scene: AnimatedViewStyle;
  readonly desk: AnimatedViewStyle;
} {
  const scene = useAnimatedStyle(() => ({
    opacity: interpolate(turn.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(turn.value, [0, 1], [1, 0.92], Extrapolation.CLAMP) }],
  }));
  const desk = useAnimatedStyle(() => ({
    opacity: interpolate(turn.value, [0.35, 0.9], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(turn.value, [0.35, 0.86, 1], [0.9, 1.012, 1], Extrapolation.CLAMP),
      },
    ],
  }));
  return { scene, desk };
}

export interface SwapFlyersProps {
  readonly flight: Flight;
  readonly turn: SharedValue<number>;
  readonly model: SessionModel;
  /** How Scootch takes the moment, in the corner and on the disc alike. */
  readonly mood: ScootchProps['mood'];
}

/**
 * The two of them in the air. Scootch drops out of his corner onto the disc, bowing out to one
 * side and turning to paper as he lands on tomato; the monster comes up out of its catch and
 * flies round the other side to sit in the corner. Run backwards, it is the way back.
 */
export function SwapFlyers({ flight, turn, model, mood }: SwapFlyersProps) {
  const { corner, desk, scene } = flight;
  // Across the line from the corner to the disc: Scootch bows out one way, the monster the other.
  const along = Math.hypot(desk.x - corner.x, desk.y - corner.y) || 1;
  const acrossX = -(desk.y - corner.y) / along;
  const acrossY = (desk.x - corner.x) / along;
  const drawn = Math.min(scene.size, MONSTER_DRAWN);

  const scootch = useAnimatedStyle(() => {
    const p = turn.value;
    const lift = Math.sin(Math.PI * p);
    const x = corner.x + (desk.x - corner.x) * p + acrossX * SCOOTCH_BOW * lift;
    const y = corner.y + (desk.y - corner.y) * p + acrossY * SCOOTCH_BOW * lift;
    const side = corner.size + (desk.size - corner.size) * p;
    return {
      transform: [
        { translateX: x - desk.size / 2 },
        { translateY: y - desk.size / 2 },
        { scale: (side / desk.size) * (1 + STRETCH * lift) },
      ],
    };
  });
  // Tomato in his corner and paper on the disc: the tomato one lies over the paper one and thins.
  const tomato = useAnimatedStyle(() => ({
    opacity: interpolate(turn.value, [0.25, 0.7], [1, 0], Extrapolation.CLAMP),
  }));
  const monster = useAnimatedStyle(() => {
    const p = turn.value;
    const lift = Math.sin(Math.PI * p);
    const x = scene.x + (corner.x - scene.x) * p - acrossX * MONSTER_BOW * lift;
    const y = scene.y + (corner.y - scene.y) * p - acrossY * MONSTER_BOW * lift;
    const side = scene.size + (corner.size - scene.size) * p;
    return {
      // It comes out of the drawing, and goes back into it: the catch draws its own monster.
      opacity: interpolate(p, [0, 0.2], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: x - drawn / 2 },
        { translateY: y - drawn / 2 },
        { scale: (side / drawn) * (1 + STRETCH * lift) },
      ],
    };
  });

  const his = {
    mood,
    attitude: model.attitude,
    workMode: model.workMode,
    reducedMotion: model.reducedMotion,
    size: desk.size,
  } as const;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Animated.View style={[styles.flyer, { width: desk.size, height: desk.size }, scootch]}>
        <Scootch {...his} tone="paper" />
        <Animated.View style={[StyleSheet.absoluteFill, tomato]}>
          <Scootch {...his} />
        </Animated.View>
      </Animated.View>
      {model.monster ? (
        <Animated.View style={[styles.flyer, { width: drawn, height: drawn }, monster]}>
          <Monster
            spec={model.monster.spec}
            idle
            reducedMotion={model.reducedMotion}
            size={drawn}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flyer: { position: 'absolute', left: 0, top: 0 },
});
