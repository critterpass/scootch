import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PHU_SPOTS, TIMING } from '@phusclass/art/class';

import { Classroom } from '../../classroom/classroom';
import { useArrival } from '../../classroom/use-arrival';
import { WALL_WARMTH } from '../../classroom/use-room-moves';
import { useKeyboardRide } from '../composer/use-keyboard-height';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { chalkboardFrame, taskCardFrame } from '../../ui/motion/hand-off';
import { useFold } from '../../ui/fold/use-fold';
import { useMayMove } from '../../ui/motion/use-feel';

import { ChalkThrow } from './chalk-throw';
import { ink, shapes } from './class-style';
import { chalkDate } from './room-scene';
import { BUBBLE_ROOM, SpeechBubble } from './speech-bubble';
import { StillYoursPanel } from './still-yours-panel';
import { DeskCard, RecessPanel } from './desk-card';
import { DeskCorners } from './desk-corners';
import { DuoDeskView } from './duo-desk-view';
import { useDeskChalk } from './use-desk-chalk';

import type { DeskViewProps } from './desk-view-props';

export type { DeskViewProps, RecessView } from './desk-view-props';

/** The desk: on iPhone Duo as its boards draw it, on any other iPhone as the App board does. */
export function DeskView(props: DeskViewProps) {
  const fold = useFold();
  return fold.pose === 'phone' ? (
    <PhoneDeskView {...props} />
  ) : (
    <DuoDeskView {...props} fold={fold} />
  );
}

/**
 * The desk: the classroom close on his desk with the chalkboard behind him, his line, and the desk
 * sheet with the one task, the late slip, Start with its fuse, and "Say it". Drawn from props only,
 * so the registry can show any state of it.
 */
function PhoneDeskView(props: DeskViewProps) {
  const { model, passing, gestures } = props;
  const t = useT();
  const { language } = useLanguage();
  const { largeText } = useScreenStyle();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [sheetHeight, setSheetHeight] = useState(0);
  const mayMove = useMayMove();

  const recess = props.recess;
  // Recess arrives from the session on the desk's shot; then he takes his tea to the window while
  // the camera pulls back.
  const arrived = useArrival(mayMove);
  const atWindow = recess !== null && arrived;
  const framing = atWindow ? 'recess' : 'desk';
  // The wall warms a step with each pressure level, at the desk only, never for a heavy task.
  const quietWall = model.heavy || model.plain || props.typing || recess !== null;
  const pressure = quietWall ? 0 : model.pressure;
  const keyboard = useKeyboardRide();
  const rides = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, keyboard.get() - insets.bottom) }],
  }));
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
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: WALL_WARMTH[pressure],
          transitionProperty: 'backgroundColor',
          transitionDuration: mayMove ? TIMING.wallWarmMs : 0,
          transitionTimingFunction: 'ease',
        },
      ]}
      onLayout={onRoomLayout}
    >
      {/* The room starts below the status bar, as on the boards; the wall fills above it. */}
      <Classroom
        style={[styles.room, { top: insets.top }]}
        framing={framing}
        mood={model.mood}
        pressure={pressure}
        chalk={words.chalk}
        date={date}
        more={words.more}
        carvings={props.carvings}
        {...(atWindow ? { phu: PHU_SPOTS.window } : {})}
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
    </Animated.View>
  );

  const deskHead = (
    <DeskCard
      model={model}
      typing={props.typing}
      chosenMinutes={props.chosenMinutes}
      ringing={props.ringing ?? false}
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
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrolled}
            // Scrolling the sheet puts the keyboard away; a tap on the composer's own buttons
            // still lands.
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
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
      <DeskCorners
        settings
        offline={props.offline}
        leading={false}
        top={insets.top}
        onSettings={props.onSettings}
      />
      {model.stillYours !== null && recess === null && !props.typing ? (
        <StillYoursPanel
          title={model.stillYours.title}
          bottom={sheetHeight + 12}
          onAnswer={props.onStillYours}
        />
      ) : null}
      {props.typing && props.onDismissTyping ? (
        // Everything outside the desk sheet, while typing: a touch there, tap or drag, puts the
        // keyboard away before anything else takes it.
        <Pressable
          testID="desk-outside-composer"
          accessible={false}
          onPressIn={props.onDismissTyping}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, rides]}>
        {gestures && recess === null ? (
          <GestureDetector gesture={gestures.swipeTimetable}>{sheet}</GestureDetector>
        ) : (
          sheet
        )}
      </Animated.View>
      {props.overlays}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#E8D2AE' },
  room: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  quiet: { backgroundColor: ink.grey },
  chalkboard: { position: 'absolute', borderRadius: 20 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  grabberZone: { paddingTop: 10, paddingBottom: 14, alignItems: 'center' },
  sheetBody: { paddingHorizontal: 20, gap: 18 },
  sheetBodyLarge: { flexShrink: 1, paddingHorizontal: 0 },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  sheetScrolled: { paddingHorizontal: 20, gap: 18 },
});
