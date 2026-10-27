import { useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
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

import { Classroom } from '../../classroom/classroom';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { GlassSurface } from '../../ui/glass-surface';
import { useScreenStyle } from '../../ui/use-screen-style';
import { chalkboardFrame, taskCardFrame } from '../../ui/motion/hand-off';

import { ChalkThrow } from './chalk-throw';
import { ClassIcon } from './class-icons';
import { ink, shapes } from './class-style';
import type { DeskModel } from './desk-model';
import { chalkDate } from './room-scene';
import { BUBBLE_ROOM, SpeechBubble } from './speech-bubble';
import { StillYoursPanel } from './still-yours-panel';
import { DeskCard, RecessPanel } from './desk-card';
import { useDeskChalk } from './use-desk-chalk';
import type { DeskGestures } from './use-desk-gestures';

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
  /** Pinned on the chalkboard at recess: the tuition notice, when the board's rule puts it up. */
  readonly notice?: ReactNode;
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
  const { largeText } = useScreenStyle();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [sheetHeight, setSheetHeight] = useState(0);

  const recess = props.recess;
  const framing = recess === null ? 'desk' : 'recess';
  const date = chalkDate(props.now, language);
  const line = passing?.text ?? model.line?.text ?? null;

  // The board grows out of the chalkboard's frame; the chalk ends before his bubble.
  const { chalkboard, words } = useDeskChalk(model.chalk, recess === null);

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
      ) : (
        props.notice
      )}
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
          // At the largest sizes the sheet stops below his bubble and scrolls; otherwise it may
          // grow to just under the settings button.
          maxHeight: height - insets.top - (largeText ? BUBBLE_ROOM : 56),
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
      <Animated.View
        style={[
          styles.sheetBody,
          largeText ? styles.sheetBodyLarge : null,
          gestures?.sheetContentStyle,
        ]}
      >
        {largeText ? (
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrolled}>
            {recessPanel ?? (
              <>
                {deskHead}
                {props.composer}
              </>
            )}
          </ScrollView>
        ) : (
          (recessPanel ?? (
            <>
              {deskHead}
              {props.composer}
            </>
          ))
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
        <StillYoursPanel
          title={model.stillYours.title}
          bottom={sheetHeight + 12}
          onAnswer={props.onStillYours}
        />
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
  sheetBodyLarge: { flexShrink: 1, paddingHorizontal: 0 },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  sheetScrolled: { paddingHorizontal: 20, gap: 18 },
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
});
