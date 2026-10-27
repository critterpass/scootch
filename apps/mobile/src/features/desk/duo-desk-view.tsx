import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TIMING } from '@phusclass/art/class';

import { Classroom } from '../../classroom/classroom';
import { WALL_WARMTH } from '../../classroom/use-room-moves';
import { useKeyboardRide } from '../composer/use-keyboard-height';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { foldRoom } from '../../ui/fold/fold-camera';
import type { FoldLayout } from '../../ui/fold/fold-layout';
import { foldRoomStyle, foldSheetStyle } from '../../ui/fold/fold-sheet';
import { useGlide } from '../../ui/fold/use-glide';
import { chalkboardFrame, taskCardFrame } from '../../ui/motion/hand-off';
import { useMayMove } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';

import { ChalkThrow } from './chalk-throw';
import { ink, shapes } from './class-style';
import { DeskCard, RecessPanel } from './desk-card';
import { DeskCorners } from './desk-corners';
import { DeskFold } from './desk-fold';
import type { DeskViewProps } from './desk-view';
import { duoBubble, duoChalkboard } from './duo-places';
import { chalkDate } from './room-scene';
import { SpeechBubble } from './speech-bubble';
import { StillYoursPanel } from './still-yours-panel';
import { useDeskChalk } from './use-desk-chalk';

/** Room kept for his bubble above the card at the largest text sizes, in points. */
const BUBBLE_CLEAR = 220;

/**
 * The desk on iPhone Duo, as the Duo boards draw it: the wide room through each pose's camera,
 * the task on a compact card floating in its corner (its label, title, late slip and Start), the
 * controls down the side, and opened out the board as the left page with its place on the wall
 * left empty. Telling him is the side's microphone; while he listens or reads, the composer joins
 * the card. Every pose keeps the same parts, so a fold only moves them.
 */
export function DuoDeskView(props: DeskViewProps & { readonly fold: FoldLayout }) {
  const { model, passing, gestures, fold } = props;
  const t = useT();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const mayMove = useMayMove();
  // At the largest text sizes the card stops below his bubble and scrolls, as the desk's does.
  const { largeText } = useScreenStyle();
  const bubble = duoBubble(fold, foldRoom(fold)?.camera);
  const capped = largeText && fold.sheet?.top === null;
  const [sheetHeight, setSheetHeight] = useState(0);
  const recess = props.recess;
  const room = foldRoom(fold);
  const quietWall = model.heavy || model.plain || props.typing || recess !== null;
  const pressure = quietWall ? 0 : model.pressure;
  const keyboard = useKeyboardRide();
  const rides = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, keyboard.get() - insets.bottom) }],
  }));
  const glide = useGlide(fold.sheet?.left ?? 0, -(fold.sheet?.bottom ?? 0));
  const line = passing?.text ?? model.line?.text ?? null;
  const { words } = useDeskChalk(model.chalk, false);
  const chalkboard = room ? duoChalkboard(room.camera, fold.room.width) : null;
  const onWall = room?.board !== 'off' && recess === null && chalkboard !== null;

  const onRoomLayout = () => {
    if (chalkboard) chalkboardFrame.set(chalkboard);
  };
  const onCardLayout = (event: LayoutChangeEvent) => {
    const { y, width: w, height: h } = event.nativeEvent.layout;
    const left = fold.sheet?.left ?? 0;
    taskCardFrame.set({ x: left + 20, y: fold.height - sheetHeight + y, width: w, height: h });
  };

  const scene = (
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
      {room ? (
        <Classroom
          style={[styles.room, foldRoomStyle(fold, 0)]}
          composition={room.composition}
          camera={room.camera}
          board={recess === null ? room.board : 'on'}
          mood={model.mood}
          pressure={pressure}
          chalk={words.chalk}
          date={chalkDate(props.now, language)}
          more={words.more}
          carvings={props.carvings}
          {...(line !== null ? { accessibilityLabel: line } : {})}
          testID="desk-room"
        />
      ) : null}
      {model.heavy ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.quiet]} />
      ) : null}
      {onWall && chalkboard ? (
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
      {recess !== null ? props.notice : null}
    </Animated.View>
  );

  const composing = props.duo?.composing === true || props.typing;
  const body =
    recess !== null ? (
      <RecessPanel recess={recess} onBackToClass={props.onBackToClass} />
    ) : (
      <>
        <DeskCard
          model={model}
          typing={props.typing}
          chosenMinutes={props.chosenMinutes}
          ringing={props.ringing ?? false}
          compact
          onCardLayout={onCardLayout}
          onStart={props.onStart}
          onLength={props.onLength}
          onSlip={props.onSlip}
          onNotNow={props.onNotNow}
        />
        {composing ? props.composer : null}
      </>
    );
  const sheet = (
    <Animated.View
      testID="desk-sheet"
      onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
      style={[
        styles.sheet,
        shapes.sheet,
        { paddingBottom: fold.sheet?.floating === false ? Math.max(insets.bottom, 12) + 8 : 18 },
        foldSheetStyle(fold),
        capped ? { maxHeight: fold.height - bubble.top - BUBBLE_CLEAR } : null,
        gestures?.sheetStyle,
      ]}
    >
      <Animated.View
        style={[styles.sheetBody, capped ? styles.shrink : null, gestures?.sheetContentStyle]}
      >
        {capped ? <ScrollView style={styles.shrink}>{body}</ScrollView> : body}
      </Animated.View>
    </Animated.View>
  );

  return (
    <View style={styles.fill} testID="desk">
      {gestures ? <GestureDetector gesture={gestures.pullBoard}>{scene}</GestureDetector> : scene}
      {model.chalkThrow && recess === null ? (
        <ChalkThrow top={0} {...(props.onChalkThrown ? { onThrown: props.onChalkThrown } : {})} />
      ) : null}
      {line !== null && line !== '' ? <SpeechBubble text={line} place="desk" at={bubble} /> : null}
      <DeskCorners
        settings={false}
        offline={props.offline}
        leading={fold.controls === 'leading'}
        top={insets.top}
        onSettings={props.onSettings}
      />
      {model.stillYours !== null && recess === null && !props.typing ? (
        <StillYoursPanel
          title={model.stillYours.title}
          bottom={sheetHeight + 26}
          onAnswer={props.onStillYours}
        />
      ) : null}
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, rides]}>
        <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, glide]}>
          {gestures && recess === null ? (
            <GestureDetector gesture={gestures.swipeTimetable}>{sheet}</GestureDetector>
          ) : (
            sheet
          )}
        </Animated.View>
      </Animated.View>
      <DeskFold
        layout={fold}
        boardPage={recess === null}
        {...(props.boardPage ? { boardData: props.boardPage } : {})}
        onOpenBoard={props.onOpenBoard}
        onOpenTimetable={props.onOpenTimetable}
        onSettings={props.onSettings}
        {...(props.duo?.tell ? { tell: props.duo.tell } : {})}
      />
      {props.overlays}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#E8D2AE' },
  room: { position: 'absolute', left: 0, right: 0 },
  quiet: { backgroundColor: ink.grey },
  chalkboard: { position: 'absolute', borderRadius: 12 },
  sheet: { position: 'absolute' },
  sheetBody: { paddingHorizontal: 20, paddingTop: 18, gap: 14 },
  shrink: { flexShrink: 1 },
});
