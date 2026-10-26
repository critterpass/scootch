import { useMemo, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PHU_SPOTS, type Carving } from '@phusclass/art/class';

import { Classroom, shotFor } from '../../classroom/classroom';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { GlassSurface } from '../../ui/glass-surface';
import { chalkboardFrame, taskCardFrame } from '../../ui/motion/hand-off';

import { ChalkThrow } from './chalk-throw';
import { ClassIcon } from './class-icons';
import { ink, shapes } from './class-style';
import type { DeskModel } from './desk-model';
import { chalkDate, chalkWords } from './room-scene';
import { SpeechBubble } from './speech-bubble';
import { DeskCard, RecessPanel } from './desk-card';
import type { DeskGestures } from './use-desk-gestures';

/** The chalkboard in the phone room, in room units. */
const CHALKBOARD = { x: 480, y: 100, width: 640, height: 196 } as const;

export interface RecessView {
  readonly left: string;
  /** 0 to 1 of the five minutes gone. */
  readonly gone: number;
  readonly over: boolean;
}

export interface DeskViewProps {
  readonly model: DeskModel;
  /** What he says in passing, over the model's line. */
  readonly passing: { readonly text: string } | null;
  readonly carvings: readonly Carving[];
  readonly offline: boolean;
  readonly now: number;
  /** The composer bar, or `null` where nothing may be said (recess). */
  readonly composer: ReactNode;
  readonly typing: boolean;
  readonly keyboard: number;
  /** The length chosen for the next period, if one was. */
  readonly chosenMinutes: number | null;
  readonly recess: RecessView | null;
  /** Overlays above everything: the slip sheet, flying chalk, the drum. */
  readonly overlays?: ReactNode;
  readonly gestures?: Pick<
    DeskGestures,
    'pullBoard' | 'swipeTimetable' | 'sheetStyle' | 'sheetContentStyle'
  >;
  readonly onStart: () => void;
  readonly onLength: (minutes: number) => void;
  readonly onSlip: () => void;
  readonly onNotNow: () => void;
  readonly onOpenBoard: () => void;
  readonly onOpenTimetable: () => void;
  readonly onStillYours: (answer: 'yes' | 'no') => void;
  readonly onBackToClass: () => void;
  readonly onSettings: () => void;
  readonly onChalkThrown?: () => void;
}

/**
 * The desk: the classroom close on his desk with the chalkboard behind him, his line, and the desk
 * sheet with the one task, the late slip, Start with its fuse, and "Say it". Drawn from props only,
 * so the registry can show any state of it.
 */
export function DeskView(props: DeskViewProps) {
  const { model, passing, gestures } = props;
  const t = useT();
  const { language } = useLanguage();
  const sizing = useTextSizing();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [sheetHeight, setSheetHeight] = useState(0);

  const recess = props.recess;
  const framing = recess === null ? 'desk' : 'recess';
  const words = chalkWords(model.chalk, t);
  const date = chalkDate(props.now, language);
  const line = passing?.text ?? model.line?.text ?? null;

  // Where the chalkboard sits on screen at the desk shot: the board grows out of it.
  const chalkboard = useMemo(() => {
    const camera = shotFor('desk', { width, height: height - insets.top });
    const k = width / camera.w;
    return {
      x: (CHALKBOARD.x - camera.x) * k,
      y: insets.top + (CHALKBOARD.y - camera.y) * k,
      width: CHALKBOARD.width * k,
      height: CHALKBOARD.height * k,
    };
  }, [width, height, insets.top]);

  const onRoomLayout = () => chalkboardFrame.set(chalkboard);
  const onCardLayout = (event: LayoutChangeEvent) => {
    const { y, width: w, height: h } = event.nativeEvent.layout;
    taskCardFrame.set({ x: 20, y: height - sheetHeight + y, width: w, height: h });
  };

  const room = (
    <View style={[StyleSheet.absoluteFill, styles.wall]} onLayout={onRoomLayout}>
      {/* The room starts below the status bar, as on the boards; the wall fills above it. */}
      <Classroom
        style={[styles.room, { top: insets.top }]}
        framing={framing}
        mood={model.mood}
        chalk={words.chalk}
        date={date}
        more={words.more}
        carvings={props.carvings}
        {...(recess !== null ? { phu: PHU_SPOTS.window } : {})}
        {...(line !== null ? { accessibilityLabel: line } : {})}
        testID="desk-room"
      />
      {model.heavy ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.quiet]} />
      ) : null}
      {recess === null ? (
        <Pressable
          testID="desk-chalkboard"
          accessibilityRole="button"
          accessibilityLabel={t('desk.openBoard')}
          onPress={props.onOpenBoard}
          style={[
            styles.chalkboard,
            {
              left: chalkboard.x,
              top: chalkboard.y,
              width: chalkboard.width,
              height: chalkboard.height,
            },
          ]}
        />
      ) : null}
    </View>
  );

  const deskHead = (
    <DeskCard
      model={model}
      typing={props.typing}
      chosenMinutes={props.chosenMinutes}
      onCardLayout={onCardLayout}
      onStart={props.onStart}
      onLength={props.onLength}
      onSlip={props.onSlip}
      onNotNow={props.onNotNow}
    />
  );
  const recessPanel =
    recess === null ? null : <RecessPanel recess={recess} onBackToClass={props.onBackToClass} />;

  const sheet = (
    <Animated.View
      testID="desk-sheet"
      onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
      style={[
        styles.sheet,
        shapes.sheet,
        {
          paddingBottom: Math.max(insets.bottom, 12) + 8,
          bottom: props.keyboard > 0 ? props.keyboard - insets.bottom : 0,
        },
        gestures?.sheetStyle,
      ]}
    >
      <Pressable
        testID="desk-timetable"
        accessibilityRole="button"
        accessibilityLabel={t('desk.openTimetable')}
        onPress={props.onOpenTimetable}
        disabled={recess !== null}
        style={styles.grabberZone}
      >
        <View style={shapes.grabber} />
      </Pressable>
      <Animated.View style={[styles.sheetBody, gestures?.sheetContentStyle]}>
        {recessPanel ?? (
          <>
            {deskHead}
            {props.composer}
          </>
        )}
      </Animated.View>
    </Animated.View>
  );

  return (
    <View style={styles.fill} testID="desk">
      {gestures ? <GestureDetector gesture={gestures.pullBoard}>{room}</GestureDetector> : room}
      {model.chalkThrow && recess === null ? (
        <ChalkThrow
          top={insets.top}
          {...(props.onChalkThrown ? { onThrown: props.onChalkThrown } : {})}
        />
      ) : null}
      {line !== null && line !== '' ? (
        <SpeechBubble text={line} place="desk" top={insets.top} />
      ) : null}
      <GlassSurface interactive style={[styles.settings, { top: insets.top + 6 }]}>
        <Pressable
          testID="desk-settings"
          accessibilityRole="button"
          accessibilityLabel={t('desk.settings')}
          onPress={props.onSettings}
          style={styles.settingsPress}
        >
          <ClassIcon name="sliders" color={ink.text} />
        </Pressable>
      </GlassSurface>
      {props.offline ? (
        <GlassSurface style={[styles.offline, { top: insets.top + 18 }]} testID="desk-offline">
          <ClassIcon name="offline" color="#8A7F74" size={15} weight={2.2} />
          <Text
            accessibilityRole="text"
            allowFontScaling={sizing.allowFontScaling}
            style={[styles.offlineText, { fontSize: sizing.size(13) }]}
          >
            {t('desk.offline')}
          </Text>
        </GlassSurface>
      ) : null}
      {model.stillYours !== null && recess === null && !props.typing ? (
        <GlassSurface
          style={[styles.stillYours, { bottom: sheetHeight + 12 }]}
          testID="desk-still-yours"
        >
          <Text
            allowFontScaling={sizing.allowFontScaling}
            numberOfLines={2}
            style={[styles.stillText, { fontSize: sizing.size(14) }]}
          >
            <Text style={styles.stillAsk}>{t('desk.stillYours')} </Text>
            {model.stillYours.title}
          </Text>
          <View style={styles.stillButtons}>
            <Pressable
              accessibilityRole="button"
              onPress={() => props.onStillYours('yes')}
              style={[styles.stillButton, shapes.soft]}
            >
              <Text allowFontScaling={sizing.allowFontScaling} style={styles.stillButtonText}>
                {t('desk.stillYoursKeep')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => props.onStillYours('no')}
              style={[styles.stillButton, shapes.soft]}
            >
              <Text allowFontScaling={sizing.allowFontScaling} style={styles.stillButtonText}>
                {t('desk.stillYoursDrop')}
              </Text>
            </Pressable>
          </View>
        </GlassSurface>
      ) : null}
      {gestures && recess === null ? (
        <GestureDetector gesture={gestures.swipeTimetable}>{sheet}</GestureDetector>
      ) : (
        sheet
      )}
      {props.overlays}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#E8D2AE' },
  wall: { backgroundColor: '#FFF1DC' },
  room: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  settings: { position: 'absolute', right: 18, width: 40, height: 40, borderRadius: 20, zIndex: 3 },
  settingsPress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  quiet: { backgroundColor: ink.grey },
  chalkboard: { position: 'absolute', borderRadius: 20 },
  sheet: { position: 'absolute', left: 0, right: 0 },
  grabberZone: { paddingTop: 10, paddingBottom: 14, alignItems: 'center' },
  sheetBody: { paddingHorizontal: 20, gap: 18 },
  offline: {
    position: 'absolute',
    left: 18,
    minHeight: 32,
    borderRadius: 16,
    paddingLeft: 11,
    paddingRight: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    zIndex: 3,
  },
  offlineText: { color: '#3E3933', fontWeight: '600' },
  stillYours: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 22,
    padding: 12,
    gap: 10,
  },
  stillText: { color: ink.text, lineHeight: 19 },
  stillAsk: { fontWeight: '700' },
  stillButtons: { flexDirection: 'row', gap: 8 },
  stillButton: { minHeight: 40, borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center' },
  stillButtonText: { color: ink.text, fontWeight: '600', fontSize: 15 },
});
