import { Canvas, Group, Rect } from '@shopify/react-native-skia';
import { useIsFocused } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import {
  Easing,
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
  layers,
  LOOPS,
  phuPose,
  room,
  ROOM_SIZE,
  TIMING,
  type Camera,
  type Composition,
  type Framing,
  type Layer,
  type Loop,
  type PhuMood,
  type RoomOptions,
  type Viewport,
} from '@phusclass/art/class';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../i18n/i18n-provider';
import { useMayMove } from '../ui/motion/use-feel';

import { LayerView, type DrawContext } from './layer-view';
import { useCamera } from './use-camera';
import { useHandFont } from './use-hand-font';
import { useChalkLanding, useWalk, useWall } from './use-room-moves';

/** What the room shows; the camera and composition are the classroom's own. */
type Scene = Omit<RoomOptions, 'viewport' | 'camera' | 'composition' | 'pose'>;

export interface ClassroomProps extends Scene {
  /** A named shot. The camera moves between shots on the camera curve. */
  readonly framing?: Framing;
  /** A camera of its own, instead of a named shot. */
  readonly camera?: Camera;
  /**
   * `phone` (the App board's room, the default) or `wide` (the Room board, as iPhone Duo's boards
   * see it).
   */
  readonly composition?: Composition;
  /** While it holds a camera, the view follows it frame by frame (a finger on a scrubber). */
  readonly cameraDrive?: SharedValue<Camera | null>;
  /** The desk's pressure, 0 to 5: the wall warms a step with each. Left out, the wall stays as drawn. */
  readonly pressure?: number;
  readonly accessibilityLabel?: string;
  readonly style?: ViewProps['style'];
  readonly testID?: string;
}

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
 * on the boards. His feet step and his body bobs only while he walks or paces (`walking`).
 */
const RUNNING: ReadonlySet<string> = new Set(
  Object.keys(LOOPS).filter((name) => !['breatheHead', 'steam', 'talk'].includes(name)),
);
const STILL: ReadonlySet<string> = new Set();
const OVERRIDES: DrawContext['overrides'] = {
  phu: { loop: 'breathe', walking: 'bob', pivot: [100, 220] },
  body: { loop: '' },
  'feet.left': { loop: '', walking: 'step' },
  'feet.right': { loop: '', walking: 'step' },
};
/** The room is built for one fixed camera; the shot is only the transform it is drawn through. */
const WHOLE_ROOM: Camera = { x: 0, y: 0, w: ROOM_SIZE.width };

/**
 * The classroom, drawn with Skia from the boards: the room in its phone composition, Thầy Phú
 * breathing, blinking, pacing and walking, the chalk in Kithfield Hand, and a camera that moves
 * between shots on the camera curve. A change of shot moves only the camera; a change of pose
 * redraws only him. Under Reduce Motion the camera cuts behind a short fade and nothing loops.
 * Off screen, nothing runs.
 */
export function Classroom({
  framing = 'desk',
  camera,
  cameraDrive,
  composition = 'phone',
  pressure,
  accessibilityLabel,
  style,
  testID,
  ...scene
}: ClassroomProps) {
  // The first frame is drawn at the size the room nearly always has, the window below the status
  // bar, so a screen arrives with its room already drawn; layout corrects it if it differs.
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [viewport, setViewport] = useState<Viewport>(() => ({
    width: window.width,
    height: Math.max(1, window.height - insets.top),
  }));
  const mayMove = useMayMove();
  const focused = useIsFocused();
  const hand = useHandFont();
  const t = useT();
  const banner = scene.banner ?? t('class.banner');
  const mood: PhuMood = scene.mood ?? 'over';
  const pose = useMemo(() => phuPose(mood), [mood]);

  // The scene is kept while its words are the same, even in a new array from the caller.
  const sceneKey = JSON.stringify(scene);
  const built = useMemo(
    () =>
      room({
        ...scene,
        // His pacing is the classroom's own, on its own clock (`useWalk`).
        pace: false,
        banner,
        pose,
        viewport,
        camera: WHOLE_ROOM,
        composition,
      }),
    [viewport, pose, sceneKey, banner, composition],
  );
  const target = useMemo(
    () => clampCamera(camera ?? framingFor(framing, viewport), viewport, composition),
    [viewport, camera?.x, camera?.y, camera?.w, framing, composition],
  );

  // His eyes shut for each pose drawn, by its open eyes.
  const [shutEyes] = useState(() => new WeakMap<Layer, Layer>());
  useMemo(() => {
    const open = [...layers(built.figure.root)].find((l) => l.id === 'eyes');
    const shut = findLayer(buildPhu(blinking(pose)), 'eyes');
    if (open && shut) shutEyes.set(open, shut);
  }, [built, pose, shutEyes]);

  const width = viewport.width;
  const size = `${viewport.width}x${viewport.height}`;
  const { view, veil } = useCamera(target, width, mayMove, cameraDrive, size);
  const place = built.figure.root.pieces.find(
    (p) => p.kind === 'layer' && p.layer.id === 'phu.place',
  );
  const pivot = place?.kind === 'layer' ? place.layer.pivot : undefined;
  const { walkTo, walking, pacing } = useWalk(pivot, scene.pace === true, mayMove);
  const wall = useWall(pressure ?? 0, mayMove);
  const { news, landing } = useChalkLanding(scene.chalk, scene.more, mayMove);

  // The motion clock runs only while something may move and the screen is in front.
  const clock = useSharedValue(0);
  const frames = useFrameCallback((frame) => {
    clock.set(frame.timeSinceFirstFrame);
  }, false);
  useEffect(() => {
    frames.setActive(mayMove && focused);
  }, [frames, mayMove, focused]);

  // A pose change squash-pops him in. It starts before the frame with the new pose is shown.
  const pop = useSharedValue(POP_DONE);
  const lastMood = useRef(mood);
  useLayoutEffect(() => {
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

  const defs = built.figure.defs ?? '';
  const warms = pressure !== undefined && scene.lamp !== true;
  const ctx: DrawContext = useMemo(
    () => ({
      defs,
      clock,
      running: mayMove ? RUNNING : STILL,
      overrides: OVERRIDES,
      hand,
      blink,
      shutEyes,
      oneShots: { 'phu.size': { loop: POP, ms: pop, pivot: [100, 220] } },
      walking,
      walkTo,
      pacing,
      landing,
      ...(warms ? { wall } : {}),
    }),
    [
      defs,
      clock,
      mayMove,
      hand,
      blink,
      shutEyes,
      pop,
      walking,
      walkTo,
      pacing,
      landing,
      warms,
      wall,
    ],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    if (w > 0 && h > 0 && (w !== viewport.width || h !== viewport.height))
      setViewport({ width: w, height: h });
  };

  return (
    <View
      style={[{ overflow: 'hidden', backgroundColor: built.background }, style]}
      onLayout={onLayout}
      testID={testID}
      accessible={accessibilityLabel !== undefined}
      {...(accessibilityLabel ? { accessibilityLabel, accessibilityRole: 'image' as const } : {})}
    >
      <Canvas style={{ width: viewport.width, height: viewport.height }}>
        <Group transform={view}>
          {built.figure.root.pieces.map((piece) =>
            piece.kind === 'layer' ? (
              <LayerView
                key={piece.layer.id}
                layer={piece.layer}
                ctx={ctx}
                news={piece.layer.id === 'chalk' ? news : undefined}
              />
            ) : null,
          )}
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
    </View>
  );
}

/** For a gallery: the camera a named shot takes, held inside the room. */
export function shotFor(name: Framing, viewport: Viewport): Camera {
  return clampCamera(framingFor(name, viewport), viewport, 'phone');
}
