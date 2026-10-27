import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { GlassSurface } from '../../ui/glass-surface';
import { PressSpring } from '../../ui/motion/press-spring';
import { useFeel } from '../../ui/motion/use-feel';
import { ClassIcon } from '../desk/class-icons';
import { composerOver, css, deskActionsHeight } from '../desk/class-motion';
import { curves, ink } from '../desk/class-style';

import { IdleLayer, IDLE_HEIGHT, ListeningLayer, TypingLayer } from './composer-parts';
import type { ComposerNote, ComposerState } from './composer-machine';

/** The listening panel where there is nothing to grow over. */
const LISTEN_HEIGHT = 160;
/** The desk sheet's gap between the row of buttons and the composer. */
const SHEET_GAP = 18;
/** A finger that drifts while holding still holds. */
const HOLD_RETENTION = { top: 600, bottom: 300, left: 300, right: 300 };
/** The board's `.ease`: heights 520 ms on the interface curve, opacity 300 ms `ease`. */
const GROW = { duration: 520, easing: curves.ui } as const;
const SWAP_MS = 300;

/** The room over the desk's row of buttons, `row` tall: none without one. */
function roomOver(row: number): number {
  'worklet';
  return row > 0 ? row + SHEET_GAP : 0;
}

export interface ComposerBarProps {
  readonly state: ComposerState;
  readonly onPressIn: () => void;
  readonly onPressOut: () => void;
  readonly onType: () => void;
  readonly onEdit: (draft: string) => void;
  readonly onSubmit: () => void;
  /** Typing closes, back to holding to talk. */
  readonly onCancel: () => void;
  /** The field's words when typing opens with none of its own (a capture). */
  readonly placeholder?: string;
  readonly testID?: string;
}

const NOTE_KEYS: Record<
  Exclude<ComposerNote, 'short tap'>,
  'composer.micOff' | 'composer.noHearing' | 'composer.kept'
> = {
  'mic off': 'composer.micOff',
  'no hearing': 'composer.noHearing',
  kept: 'composer.kept',
};

/**
 * "Say it" on the desk: hold to tell him, or the keyboard to type. Held, the bar grows up over
 * Late slip and Start into a listening panel showing the words as they are heard; let go, and the
 * words stay on show while they go to the board. Typing opens the keyboard key into a field that
 * grows a line at a time, up to four. Every change of height eases (520 ms), its parts crossfade,
 * and a hold too short to hear anything shakes the bar.
 */
export function ComposerBar({
  state,
  onPressIn,
  onPressOut,
  onType,
  onEdit,
  onSubmit,
  onCancel,
  testID = 'composer',
}: ComposerBarProps) {
  const t = useT();
  const sizing = useTextSizing();
  const { mayMove, haptics } = useFeel();
  const [barWidth, setBarWidth] = useState(0);

  const listening =
    state.mode === 'listening' || state.mode === 'stopping' || state.mode === 'asking';
  const showing = state.mode === 'handing';
  const typing = state.mode === 'typing';
  const open = listening || showing;
  const words =
    state.mode === 'listening' || state.mode === 'stopping'
      ? state.words.trim()
      : showing
        ? state.text
        : '';
  const note =
    (state.mode === 'typing' || state.mode === 'idle') &&
    state.note !== null &&
    state.note !== 'short tap'
      ? t(NOTE_KEYS[state.note])
      : null;

  // The glass's height, and the room the bar takes in the sheet. Listening, the glass grows over
  // the buttons above it and the sheet makes room only for what does not fit.
  const glass = useSharedValue(IDLE_HEIGHT);
  const flow = useSharedValue(IDLE_HEIGHT);
  const [idleHeight, setIdleHeight] = useState(IDLE_HEIGHT);
  const measured = useRef(false);
  // How far up the glass may grow over the desk's buttons: their row and the gap below it.
  const [over, setOver] = useState(() => roomOver(deskActionsHeight.get()));
  useAnimatedReaction(
    () => roomOver(deskActionsHeight.get()),
    (now, before) => {
      if (now !== before) scheduleOnRN(setOver, now);
    },
  );
  const grow = (glassTo: number, flowTo: number) => {
    const first = !measured.current;
    measured.current = true;
    const to = (value: number) => (mayMove && !first ? withTiming(value, GROW) : value);
    glass.set(to(glassTo));
    flow.set(to(flowTo));
  };
  const onIdle = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setIdleHeight(height);
    grow(height, height);
  };
  const onOpen = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    grow(height, Math.max(idleHeight, height - over));
  };
  const onTyping = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    grow(height, height);
  };

  // The buttons the panel grows over step back while it is up.
  useEffect(() => {
    composerOver.set(mayMove ? withTiming(open ? 1 : 0, GROW) : open ? 1 : 0);
  }, [open, mayMove]);
  useEffect(() => () => composerOver.set(0), []);

  // A hold too short to hear anything: the bar shakes, as the board's `shake`, 360 ms.
  const shake = useSharedValue(0);
  useEffect(() => {
    if (state.mode !== 'idle' || state.note !== 'short tap' || !mayMove) return;
    const step = (to: number) => withTiming(to, { duration: 72, easing: css.easeInOut });
    shake.set(withSequence(step(-7), step(6), step(-4), step(2), step(0)));
  }, [state, mayMove, shake]);

  const flowStyle = useAnimatedStyle(() => ({ height: flow.get() }));
  const glassStyle = useAnimatedStyle(() => ({
    height: glass.get(),
    transform: [{ translateX: shake.get() }],
  }));
  const minListen = over > 0 ? Math.min(LISTEN_HEIGHT, over + idleHeight) : LISTEN_HEIGHT;
  const fade = mayMove
    ? {
        entering: FadeIn.duration(SWAP_MS).easing(css.ease),
        exiting: FadeOut.duration(SWAP_MS).easing(css.ease),
      }
    : {};

  return (
    <Animated.View testID={testID}>
      <Animated.View
        style={flowStyle}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      >
        <Animated.View style={[styles.glass, glassStyle]}>
          <GlassSurface style={[StyleSheet.absoluteFill, styles.round]} />
          {typing ? (
            <Animated.View key="typing" {...fade} style={styles.layer}>
              <TypingLayer
                draft={state.draft}
                barWidth={barWidth}
                mayMove={mayMove}
                onCancel={onCancel}
                onEdit={onEdit}
                onSubmit={onSubmit}
                onLayout={onTyping}
              />
            </Animated.View>
          ) : (
            <Animated.View key="hold" {...fade} style={StyleSheet.absoluteFill}>
              <Pressable
                testID="composer-hold"
                accessibilityRole="button"
                accessibilityLabel={open ? t('composer.letGo') : t('composer.hold')}
                accessibilityHint={open ? undefined : t('composer.letGo')}
                onPressIn={() => {
                  if (haptics) {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(
                      () => undefined,
                    );
                  }
                  onPressIn();
                }}
                onPressOut={onPressOut}
                pressRetentionOffset={HOLD_RETENTION}
                style={StyleSheet.absoluteFill}
              >
                {open ? (
                  <Animated.View key="open" {...fade} style={styles.layer}>
                    <ListeningLayer
                      showing={showing}
                      words={words}
                      minHeight={minListen}
                      mayMove={mayMove}
                      onLayout={onOpen}
                    />
                  </Animated.View>
                ) : (
                  <Animated.View key="idle" {...fade} style={styles.layer}>
                    <IdleLayer onLayout={onIdle} />
                  </Animated.View>
                )}
              </Pressable>
              {open ? null : (
                <Animated.View {...fade} style={styles.keyboard}>
                  <PressSpring
                    testID="composer-type"
                    accessibilityRole="button"
                    accessibilityLabel={t('composer.typeInstead')}
                    onPress={onType}
                    style={styles.keyboardPress}
                  >
                    <ClassIcon name="keyboard" color={ink.text} size={20} />
                  </PressSpring>
                </Animated.View>
              )}
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>
      {note !== null ? (
        <Animated.Text
          entering={FadeIn.duration(200)}
          allowFontScaling={sizing.allowFontScaling}
          style={[styles.note, { fontSize: sizing.size(13) }]}
        >
          {note}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Anchored at the bottom of the bar's room: it grows upward.
  glass: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    overflow: 'hidden',
  },
  round: { borderRadius: 28 },
  layer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  keyboard: { position: 'absolute', right: 5, top: 5, width: 46, height: 46 },
  keyboardPress: {
    flex: 1,
    borderRadius: 23,
    backgroundColor: ink.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { marginTop: 8, marginHorizontal: 8, color: ink.muted, lineHeight: 18 },
});
