import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { fonts } from '@phusclass/tokens';

import { HAND_FAMILY } from '../../classroom/use-hand-font';
import { useT } from '../../i18n/i18n-provider';
import { touchHaptic } from '../../ui/motion/press-spring';
import { ROW } from '../../ui/motion/swipe-motion';
import { useFeel } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';

import type { BoardRow } from './board-rows';
import { BOARD, CHALK } from './chalk';
import { RowCorner, SwipeActions } from './row-corner';
import { rowSpeech } from './row-speech';

const ALWAYS = ReduceMotion.Never;
const SNAP = { duration: 380, dampingRatio: 0.9, reduceMotion: ALWAYS } as const;
/** The App board's chalk strike across a ticked task, then the row going. */
const STRIKE_MS = 380;
const DONE_MS = 480;
const WIPE_MS = 460;
const STRIKE_CURVE = Easing.bezier(0.65, 0, 0.35, 1);
/** A ticked or erased row leaves on CSS's `ease-in`, as the board's `doneRow` and `wipe` do. */
const leave = (duration: number) =>
  ({ duration, easing: Easing.bezier(0.42, 0, 1, 1), reduceMotion: ALWAYS }) as const;

export type RowAction = 'desk' | 'reword' | 'tick' | 'erase' | 'keep' | 'letGo';

export interface BoardRowViewProps {
  readonly row: BoardRow;
  /** His "Still yours?" under an old row. */
  readonly stillYours: string | null;
  /** Whether this row is the one slid open on its actions. */
  readonly open: boolean;
  readonly onOpen: (id: string | null) => void;
  /** Tap or long-press: the row's menu. */
  readonly onMenu: (id: string) => void;
  /** An action, after the row has played it out. */
  readonly onAction: (id: string, action: RowAction) => void;
  readonly index: number;
}

/**
 * One task on the board. Swipe it left for Desk, Tick and Erase; tap or long-press it for all of
 * them and Reword. A tick strikes it through in chalk and it goes; an erase wipes it. VoiceOver
 * gets every action by name.
 */
export function BoardRowView({
  row,
  stillYours,
  open,
  onOpen,
  onMenu,
  onAction,
  index,
}: BoardRowViewProps) {
  const t = useT();
  const { mayMove, haptics } = useFeel();
  const { size, allowFontScaling, largeText } = useScreenStyle();
  const actions: ('desk' | 'tick' | 'erase')[] = row.onDesk
    ? ['tick', 'erase']
    : ['desk', 'tick', 'erase'];
  const wide = actions.length * BOARD.actionWidth;
  const slid = useSharedValue(0);
  const start = useSharedValue(0);
  const strike = useSharedValue(0);
  const leaving = useSharedValue(0);
  const [going, setGoing] = useState<'tick' | 'erase' | null>(null);

  useEffect(() => {
    if (!open) slid.set(withSpring(0, SNAP));
  }, [open, slid]);

  const settle = (opened: boolean) => onOpen(opened ? row.id : null);
  const pan = usePanGesture({
    activeOffsetX: [-ROW.takesAfter, ROW.takesAfter],
    failOffsetY: [-ROW.scrollsAfter, ROW.scrollsAfter],
    onActivate: () => {
      'worklet';
      start.set(slid.get());
    },
    onUpdate: (event) => {
      'worklet';
      slid.set(Math.max(-wide - 24, Math.min(0, start.get() + event.translationX)));
    },
    onDeactivate: (event) => {
      'worklet';
      const opened =
        !event.canceled && (slid.get() < -BOARD.opensPast || event.velocityX < -BOARD.flick);
      slid.set(
        withSpring(opened ? -wide : 0, {
          duration: SNAP.duration,
          dampingRatio: SNAP.dampingRatio,
          velocity: event.velocityX,
          reduceMotion: ALWAYS,
        }),
      );
      scheduleOnRN(settle, opened);
    },
  });

  /** Plays a tick or an erase out, then hands it on. Where nothing may move, it is handed on at once. */
  const act = (action: RowAction) => {
    onOpen(null);
    if (haptics && (action === 'tick' || action === 'desk')) touchHaptic('primary');
    if (action !== 'tick' && action !== 'erase') {
      onAction(row.id, action);
      return;
    }
    if (!mayMove) {
      onAction(row.id, action);
      return;
    }
    setGoing(action);
    slid.set(withSpring(0, SNAP));
    const done = () => onAction(row.id, action);
    if (action === 'tick') {
      strike.set(
        withTiming(1, { duration: STRIKE_MS, easing: STRIKE_CURVE, reduceMotion: ALWAYS }),
      );
      leaving.set(
        withDelay(
          STRIKE_MS,
          withTiming(1, leave(DONE_MS), (finished) => {
            if (finished) scheduleOnRN(done);
          }),
        ),
      );
    } else {
      leaving.set(
        withTiming(1, leave(WIPE_MS), (finished) => {
          if (finished) scheduleOnRN(done);
        }),
      );
    }
  };

  const front = useAnimatedStyle(() => {
    const away = leaving.get();
    const shift = going === 'tick' ? 20 * away : going === 'erase' ? -30 * away : 0;
    return { opacity: 1 - away, transform: [{ translateX: slid.get() + shift }] };
  }, [going]);
  const behind = useAnimatedStyle(() => ({
    opacity: slid.get() < 0 ? 1 : 0,
    transform: [{ translateX: wide + Math.max(slid.get(), -wide) }],
  }));
  const strikeStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: strike.get() }] }));

  const chalkSize = size(BOARD.chalkSize);

  const speech = rowSpeech(row, stillYours, t);
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName;
    const action = speech.actionNamed(name);
    if (name === 'activate') onMenu(row.id);
    else if (action !== null) act(action);
  };

  return (
    <Animated.View
      {...(mayMove ? { layout: LinearTransition.duration(ROW.closeMs) } : {})}
      style={[styles.row, styles.ruled]}
    >
      <SwipeActions actions={actions} index={index} style={[{ width: wide }, behind]} onAct={act} />
      <GestureDetector gesture={pan}>
        <Animated.View style={front}>
          <Pressable
            testID={`board-row-${index}`}
            accessibilityRole="button"
            accessibilityLabel={speech.label}
            accessibilityHint={t('board.row.actionsHint')}
            accessibilityActions={speech.actions}
            onAccessibilityAction={onAccessibilityAction}
            onPress={() => (open ? onOpen(null) : onMenu(row.id))}
            onLongPress={() => {
              if (haptics) touchHaptic('choice');
              onMenu(row.id);
            }}
            delayLongPress={430}
            // Old chalk: the whole row fades, and its words fade once more.
            style={[
              styles.front,
              largeText ? styles.frontLarge : null,
              row.faded ? styles.faded : null,
            ]}
          >
            <View style={[styles.dot, row.onDesk ? styles.deskDot : styles.ringDot]} />
            <View style={[styles.words, largeText ? styles.wordsLarge : null]}>
              <Text
                allowFontScaling={allowFontScaling}
                style={[
                  styles.chalk,
                  { fontSize: chalkSize, lineHeight: chalkSize * 1.3 },
                  row.today ? styles.today : null,
                  row.faded ? styles.faded : null,
                ]}
              >
                {row.text}
              </Text>
              {stillYours !== null ? (
                <Text
                  allowFontScaling={allowFontScaling}
                  style={[styles.question, { fontSize: size(12.5) }]}
                >
                  {stillYours}
                </Text>
              ) : null}
              {going === 'tick' ? <Animated.View style={[styles.strike, strikeStyle]} /> : null}
            </View>
            <RowCorner row={row} index={index} onAct={act} />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: BOARD.rowMin,
    overflow: 'hidden',
  },
  ruled: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: CHALK.rule,
  },
  front: {
    minHeight: BOARD.rowMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  frontLarge: {
    flexWrap: 'wrap',
    paddingVertical: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deskDot: {
    backgroundColor: CHALK.desk,
  },
  ringDot: {
    borderWidth: 2,
    borderColor: CHALK.ring,
  },
  words: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  wordsLarge: {
    flexBasis: '80%',
  },
  chalk: {
    fontFamily: HAND_FAMILY,
    color: CHALK.chalk,
  },
  today: {
    textDecorationLine: 'underline',
    textDecorationColor: CHALK.chalk,
  },
  question: {
    color: CHALK.faint,
    fontFamily: fonts.body,
  },
  faded: { opacity: 0.45 },
  strike: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 3,
    borderRadius: 2,
    backgroundColor: CHALK.chalk,
    transformOrigin: 'left center',
  },
});
