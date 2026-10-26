import { Canvas, Group, Rect } from '@shopify/react-native-skia';
import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  blinking,
  buildPhu,
  canBlink,
  clampCamera,
  CURVES,
  findLayer,
  framing as framingFor,
  LOOPS,
  phuPose,
  room,
  TIMING,
  type Camera,
  type Framing,
  type Loop,
  type PhuMood,
  type RoomOptions,
  type Viewport,
} from '@phusclass/art/class';

import { useMayMove } from '../ui/motion/use-feel';

import { LayerView, type DrawContext } from './layer-view';
import { useHandFont } from './use-hand-font';

/** What the room shows; the camera and composition are the classroom's own. */
type Scene = Omit<RoomOptions, 'viewport' | 'camera' | 'composition' | 'pose'>;

export interface ClassroomProps extends Scene {
  /** A named shot. The camera moves between shots on the camera curve. */
  readonly framing?: Framing;
  /** A camera of its own, instead of a named shot. */
  readonly camera?: Camera;
  /** While it holds a camera, the view follows it frame by frame (a finger on a scrubber). */
  readonly cameraDrive?: SharedValue<Camera | null>;
  readonly accessibilityLabel?: string;
  readonly style?: ViewProps['style'];
  readonly testID?: string;
}

const bezier = (c: readonly [number, number, number, number]) =>
  Easing.bezier(c[0], c[1], c[2], c[3]);
const CAMERA_EASING = bezier(CURVES.camera);

/** The App board's squash-pop into a new pose: from his feet, overshoot, settle. */
const POP: Loop = {
  periodMs: TIMING.posePopMs,
  curve: CURVES.character,
  frames: [
    { at: 0, scaleX: 0.93, scaleY: 1.07 },
    { at: 0.45, scaleX: 1.05, scaleY: 0.95 },
    { at: 1, scaleX: 1, scaleY: 1 },
  ],
};
const POP_DONE = TIMING.posePopMs - 0.01;

/**
 * Loops that run while he and the room may move. The App board breathes his whole body from his
 * feet, so the body's and head's own breaths stay off; the thermos on his desk does not steam, as
 * on the boards; pacing and steps run only while he paces.
 */
const IDLE = Object.keys(LOOPS).filter(
  (name) => !['breatheHead', 'steam', 'talk', 'pace', 'paceWide', 'step'].includes(name),
);
const PACING = ['pace', 'paceWide', 'step'];
const OVERRIDES: DrawContext['overrides'] = {
  phu: { loop: 'breathe', pivot: [100, 220] },
  body: { loop: '', pivot: [0, 0] },
};

/**
 * The classroom, drawn with Skia from the boards: the room in its phone composition, Thầy Phú
 * breathing, blinking and pacing, the chalk in Kithfield Hand, and a camera that moves between
 * shots on the camera curve. Under Reduce Motion the camera cuts behind a short fade and nothing
 * loops. Off screen, nothing runs.
 */
export function Classroom({
  framing = 'desk',
  camera,
  cameraDrive,
  accessibilityLabel,
  style,
  testID,
  ...scene
}: ClassroomProps) {
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const mayMove = useMayMove();
  const focused = useIsFocused();
  const hand = useHandFont();
  const mood: PhuMood = scene.mood ?? 'over';
  const pose = useMemo(() => phuPose(mood), [mood]);

  // The scene is kept while its words are the same, even in a new array from the caller.
  const sceneKey = JSON.stringify(scene);
  const built = useMemo(() => {
    if (!viewport) return null;
    const target = camera ?? framingFor(framing, viewport);
    return room({ ...scene, pose, viewport, camera: target, composition: 'phone' });
  }, [viewport, camera?.x, camera?.y, camera?.w, framing, pose, sceneKey]);

  const shutEyes = useMemo(() => findLayer(buildPhu(blinking(pose)), 'eyes'), [pose]);

  // The camera, in room units, on the UI thread.
  const camX = useSharedValue(0);
  const camY = useSharedValue(0);
  const camW = useSharedValue(1600);
  const veil = useSharedValue(0);
  const placed = useRef(false);
  const target = built?.camera;
  useEffect(() => {
    if (!target) return;
    if (!placed.current) {
      placed.current = true;
      camX.set(target.x);
      camY.set(target.y);
      camW.set(target.w);
      return;
    }
    if (mayMove) {
      const move = { duration: TIMING.cameraMs, easing: CAMERA_EASING };
      camX.set(withTiming(target.x, move));
      camY.set(withTiming(target.y, move));
      camW.set(withTiming(target.w, move));
    } else {
      camX.set(target.x);
      camY.set(target.y);
      camW.set(target.w);
      veil.set(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(0, { duration: TIMING.cameraCutFadeMs }),
        ),
      );
    }
  }, [target?.x, target?.y, target?.w, mayMove, camX, camY, camW, veil, target]);

  const width = viewport?.width ?? 1;
  const view = useDerivedValue(() => {
    const drive = cameraDrive?.get() ?? null;
    const c = drive ?? { x: camX.get(), y: camY.get(), w: camW.get() };
    return [{ scale: width / c.w }, { translateX: -c.x }, { translateY: -c.y }];
  });

  // The motion clock runs only while something may move and the screen is in front.
  const clock = useSharedValue(0);
  const frames = useFrameCallback((frame) => {
    clock.set(frame.timeSinceFirstFrame);
  }, false);
  useEffect(() => {
    frames.setActive(mayMove && focused);
  }, [frames, mayMove, focused]);

  // A pose change squash-pops him in.
  const pop = useSharedValue(POP_DONE);
  const lastMood = useRef(mood);
  useEffect(() => {
    if (lastMood.current === mood) return;
    lastMood.current = mood;
    if (!mayMove) return;
    pop.set(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(POP_DONE, { duration: TIMING.posePopMs, easing: Easing.linear }),
      ),
    );
  }, [mood, mayMove, pop]);

  // A blink every few seconds, while his eyes can blink.
  const blink = useSharedValue(0);
  useEffect(() => {
    if (!mayMove || !focused || !canBlink(pose)) return undefined;
    const [lo, hi] = TIMING.blinkEveryMs;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(
        () => {
          blink.set(
            withSequence(
              withTiming(1, { duration: 0 }),
              withDelay(TIMING.blinkMs, withTiming(0, { duration: 0 })),
            ),
          );
          next();
        },
        lo + Math.random() * (hi - lo),
      );
    };
    next();
    return () => clearTimeout(timer);
  }, [mayMove, focused, pose, blink]);

  const running = useMemo(
    () => new Set(mayMove ? [...IDLE, ...(scene.pace ? PACING : [])] : []),
    [mayMove, scene.pace],
  );

  const ctx: DrawContext | null = useMemo(
    () =>
      built
        ? {
            defs: built.figure.defs,
            clock,
            running,
            overrides: OVERRIDES,
            hand,
            blink,
            ...(shutEyes ? { shutEyes } : {}),
            oneShots: { 'phu.size': { loop: POP, ms: pop, pivot: [100, 220] } },
          }
        : null,
    [built, clock, running, hand, blink, shutEyes, pop],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    if (w > 0 && h > 0 && (w !== viewport?.width || h !== viewport.height))
      setViewport({ width: w, height: h });
  };

  return (
    <View
      style={[{ overflow: 'hidden', backgroundColor: built?.background }, style]}
      onLayout={onLayout}
      testID={testID}
      accessible={accessibilityLabel !== undefined}
      {...(accessibilityLabel ? { accessibilityLabel, accessibilityRole: 'image' as const } : {})}
    >
      {built && ctx && viewport ? (
        <Canvas style={{ width: viewport.width, height: viewport.height }}>
          <Group transform={view}>
            <LayerView layer={built.figure.root} ctx={ctx} />
          </Group>
          <Rect
            x={0}
            y={0}
            width={viewport.width}
            height={viewport.height}
            color={built.background}
            opacity={veil}
          />
        </Canvas>
      ) : null}
    </View>
  );
}

/** For a gallery: the camera a named shot takes, held inside the room. */
export function shotFor(name: Framing, viewport: Viewport): Camera {
  return clampCamera(framingFor(name, viewport), viewport, 'phone');
}
