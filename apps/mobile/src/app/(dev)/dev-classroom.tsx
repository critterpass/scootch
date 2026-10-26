import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

import {
  between,
  buildPhu,
  buildProp,
  FRAMING_NAMES,
  LOOPS,
  phuPose,
  PHU_MOODS,
  pressureMood,
  PROP_NAMES,
  type Camera,
  type Carving,
  type Framing,
  type PhuMood,
} from '@phusclass/art/class';
import { colors, fonts, fontSizes, radius, spacing, type Palette } from '@phusclass/tokens';

import { Classroom, shotFor } from '../../classroom/classroom';
import { FigureCanvas } from '../../classroom/figure-canvas';
import { useHandFont } from '../../classroom/use-hand-font';
import { PressSpring } from '../../ui/motion/press-spring';
import { SafeFrame } from '../../ui/safe-frame';

// Developer copy, English only: the board's sample chalk.
const CHALK = ['Dentist email', 'Landlord email', 'Renew passport'];
const CARVINGS: Carving[] = [
  { kind: 'star' },
  { kind: 'heart' },
  { kind: 'initials', text: 'M.A' },
  { kind: 'mark' },
];
const ALL_LOOPS = new Set(
  Object.keys(LOOPS).filter((n) => !['pace', 'paceWide', 'step', 'talk'].includes(n)),
);
const VIEW_HEIGHT = 420;

function Chip({
  id,
  label,
  selected,
  palette,
  onPress,
}: {
  readonly id: string;
  readonly label: string;
  readonly selected: boolean;
  readonly palette: Palette;
  readonly onPress: () => void;
}) {
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={id}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? palette.ink : palette.surface }]}
    >
      <Text style={[styles.chipLabel, { color: selected ? palette.page : palette.ink }]}>
        {label}
      </Text>
    </PressSpring>
  );
}

/**
 * The classroom on the phone: the room through the camera, every shot, every pose and pressure
 * step, pacing, the lamp and the board taken down; a scrubber that moves the camera under a
 * finger; and the gallery of all 24 poses and 19 props with their loops running.
 */
export default function DevClassroom() {
  const palette = colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { width } = useWindowDimensions();
  const [shot, setShot] = useState<Framing>('desk');
  const [mood, setMood] = useState<PhuMood>('over');
  const [pace, setPace] = useState(false);
  const [lamp, setLamp] = useState(false);
  const [boardOff, setBoardOff] = useState(false);
  const hand = useHandFont();
  const router = useRouter();

  // The scrubber: a finger along the bar takes the camera from the desk to recess.
  const drive = useSharedValue<Camera | null>(null);
  const viewport = useMemo(() => ({ width, height: VIEW_HEIGHT }), [width]);
  const shots = useMemo(
    () => ({
      desk: shotFor('desk', viewport),
      session: shotFor('session', viewport),
      recess: shotFor('recess', viewport),
    }),
    [viewport],
  );
  const barWidth = width - spacing.md * 2;
  const scrub = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      const t = Math.min(1, Math.max(0, e.x / barWidth));
      drive.set(
        t < 0.5
          ? between(shots.desk, shots.session, t * 2)
          : between(shots.session, shots.recess, t * 2 - 1),
      );
    })
    .onUpdate((e) => {
      const t = Math.min(1, Math.max(0, e.x / barWidth));
      drive.set(
        t < 0.5
          ? between(shots.desk, shots.session, t * 2)
          : between(shots.session, shots.recess, t * 2 - 1),
      );
    });

  // One clock for the gallery.
  const clock = useSharedValue(0);
  const frames = useFrameCallback((frame) => clock.set(frame.timeSinceFirstFrame), false);
  useEffect(() => {
    frames.setActive(true);
    return () => frames.setActive(false);
  }, [frames]);

  const poses = useMemo(
    () => PHU_MOODS.map((m) => ({ mood: m, figure: buildPhu(phuPose(m)) })),
    [],
  );
  const props = useMemo(() => PROP_NAMES.map((name) => ({ name, figure: buildProp(name) })), []);
  const tile = Math.floor((width - spacing.md * 2 - spacing.sm * 3) / 4);

  return (
    <SafeFrame style={[styles.screen, { backgroundColor: palette.page }]}>
      <ScrollView testID="dev-classroom" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: palette.ink }]}>
            Classroom
          </Text>
          <Chip
            id="dev-classroom-close"
            label="Done"
            selected={false}
            palette={palette}
            onPress={() => router.back()}
          />
        </View>

        <Classroom
          testID="dev-classroom-view"
          style={{ width, height: VIEW_HEIGHT, marginHorizontal: -spacing.md }}
          framing={shot}
          cameraDrive={drive}
          mood={mood}
          pace={pace}
          lamp={lamp}
          board={boardOff ? 'off' : 'on'}
          date="Monday 26"
          chalk={CHALK}
          carvings={CARVINGS}
          {...(shot === 'recess' ? { phu: { x: 990, y: 345 } } : {})}
        />

        <Text style={[styles.heading, { color: palette.muted }]}>Camera: drag along the bar</Text>
        <GestureDetector gesture={scrub}>
          <View
            testID="dev-classroom-scrubber"
            style={[styles.bar, { backgroundColor: palette.surface }]}
          >
            {(['Desk', 'Session', 'Recess'] as const).map((label) => (
              <Text key={label} style={[styles.barLabel, { color: palette.muted }]}>
                {label}
              </Text>
            ))}
          </View>
        </GestureDetector>
        <View style={styles.wrap}>
          {FRAMING_NAMES.map((name) => (
            <Chip
              key={name}
              id={`dev-classroom-shot-${name}`}
              label={name}
              selected={shot === name}
              palette={palette}
              onPress={() => {
                drive.set(null);
                setShot(name);
              }}
            />
          ))}
        </View>

        <Text style={[styles.heading, { color: palette.muted }]}>Pressure</Text>
        <View style={styles.wrap}>
          {[0, 1, 2, 3, 4, 5].map((step) => (
            <Chip
              key={step}
              id={`dev-classroom-pressure-${step}`}
              label={String(step)}
              selected={mood === pressureMood(step)}
              palette={palette}
              onPress={() => setMood(pressureMood(step))}
            />
          ))}
        </View>
        <View style={styles.wrap}>
          <Chip
            id="dev-classroom-pace"
            label="Pace"
            selected={pace}
            palette={palette}
            onPress={() => setPace(!pace)}
          />
          <Chip
            id="dev-classroom-lamp"
            label="Lamp"
            selected={lamp}
            palette={palette}
            onPress={() => setLamp(!lamp)}
          />
          <Chip
            id="dev-classroom-board-off"
            label="Board off"
            selected={boardOff}
            palette={palette}
            onPress={() => setBoardOff(!boardOff)}
          />
        </View>

        <Text style={[styles.heading, { color: palette.muted }]}>
          Poses: tap one to put him in it
        </Text>
        <View testID="dev-classroom-poses" style={styles.grid}>
          {poses.map(({ mood: m, figure }) => (
            <PressSpring
              key={m}
              accessibilityRole="button"
              testID={`dev-classroom-pose-${m}`}
              onPress={() => setMood(m)}
              style={[
                styles.tile,
                { width: tile, backgroundColor: m === mood ? palette.surface : 'transparent' },
              ]}
            >
              <FigureCanvas
                figure={figure}
                width={tile - 8}
                clock={clock}
                running={ALL_LOOPS}
                hand={hand}
              />
              <Text style={[styles.tileLabel, { color: palette.muted }]}>{m}</Text>
            </PressSpring>
          ))}
        </View>

        <Text style={[styles.heading, { color: palette.muted }]}>Props</Text>
        <View testID="dev-classroom-props" style={styles.grid}>
          {props.map(({ name, figure }) => (
            <View key={name} style={[styles.tile, { width: tile }]}>
              <FigureCanvas
                figure={figure}
                width={tile - 16}
                clock={clock}
                running={ALL_LOOPS}
                hand={hand}
              />
              <Text style={[styles.tileLabel, { color: palette.muted }]}>{name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.sentence, fontWeight: '700' },
  heading: { fontFamily: fonts.body, fontSize: 13, marginTop: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLabel: { fontFamily: fonts.body, fontSize: fontSizes.body },
  bar: {
    height: 52,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  barLabel: { fontFamily: fonts.body, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { alignItems: 'center', paddingVertical: spacing.xs, borderRadius: radius.md },
  tileLabel: { fontFamily: fonts.body, fontSize: 12 },
});
