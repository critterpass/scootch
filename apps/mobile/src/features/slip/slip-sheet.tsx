import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { PressSpring } from '../../ui/motion/press-spring';
import { useFeel } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';
import { css } from '../desk/class-motion';
import { buttonText, curves, ink, shapes } from '../desk/class-style';
import { BUBBLE_ROOM } from '../desk/speech-bubble';

import { gradeExcuse, PICKED_EXCUSES, type Excuse, type Graded } from './slip-model';
import { EXCUSE_WORDS, ExcuseChip, SlipPaper } from './slip-paper';

/** A drag down this far, or a flick this fast (points a second), puts the slip away. */
const CLOSES_AT = 110;
/** The pull's settle, carrying the finger's speed: about 555 ms, no overshoot. */
const SETTLE = { duration: 370, dampingRatio: 1 } as const; // PULL_SPRING in motion-tokens.ts
/** The board's `.slide`: the sheet 540 ms on the interface curve, its scrim 360 ms `ease`. */
const SLIDE = { duration: 540, easing: curves.ui } as const;
const SCRIM = { duration: 360, easing: css.ease } as const;
const RISE = SlideInDown.duration(SLIDE.duration).easing(curves.ui);

export interface SlipSheetProps {
  readonly taskTitle: string;
  readonly taskId: string;
  /** For a capture: the excuse already picked. */
  readonly initial?: Excuse | null;
  /** Handed in: called at once, as the slip starts to go. */
  readonly onHandIn: (excuse: string, graded: Graded) => void;
  /** "Fine, I'll start": called at once, as the slip starts to go. */
  readonly onStart: () => void;
  /** The slip has gone: it may be taken off the screen. */
  readonly onClose: () => void;
}

/**
 * The late slip: snoozing is allowed and costs an excuse, picked, or written in the user's own
 * words. He grades it in red the moment it is on the slip; a real reason gets "Accepted." and no
 * grade. Drag it down or tap outside to put it away; "Fine, I'll start" starts the period instead.
 * At the largest text sizes it stops below his bubble and scrolls.
 */
export function SlipSheet({
  taskTitle,
  taskId,
  initial = null,
  onHandIn,
  onStart,
  onClose,
}: SlipSheetProps) {
  const t = useT();
  const { language } = useLanguage();
  const sizing = useTextSizing();
  const { mayMove } = useFeel();
  const { largeText } = useScreenStyle();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [excuse, setExcuse] = useState<Excuse | null>(initial);
  const [draft, setDraft] = useState(initial?.kind === 'written' ? initial.words : '');
  const [picks, setPicks] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const graded = excuse === null ? null : gradeExcuse(language, excuse, taskId);
  const excuseText =
    excuse === null
      ? null
      : excuse.kind === 'picked'
        ? t(EXCUSE_WORDS[excuse.which])
        : excuse.words;

  // How far the sheet is pulled down, its height, and the scrim's and the sheet's strength.
  const drag = useSharedValue(0);
  const from = useSharedValue(0);
  const sheetHeight = useSharedValue(height);
  const scrim = useSharedValue(0);
  const fade = useSharedValue(1);
  useEffect(() => {
    scrim.set(withTiming(1, mayMove ? SCRIM : { duration: 200 }));
  }, [scrim, mayMove]);

  /** The slip goes, from wherever it is, and is taken away once it has. */
  const leave = (velocity: number | null) => {
    'worklet';
    scrim.set(withTiming(0, SCRIM));
    const gone = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(onClose);
    };
    if (!mayMove) fade.set(withTiming(0, { duration: 200 }, gone));
    else if (velocity === null) drag.set(withTiming(sheetHeight.get(), SLIDE, gone));
    else drag.set(withSpring(sheetHeight.get(), { ...SETTLE, velocity }, gone));
  };
  const close = (velocity: number | null = null) => {
    if (leaving) return;
    setLeaving(true);
    leave(velocity);
  };

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .enabled(!leaving)
    .onBegin(() => {
      // A grab mid-settle holds the sheet where it is.
      cancelAnimation(drag);
      from.set(drag.get());
    })
    .onUpdate((event) => {
      drag.set(Math.max(0, from.get() + event.translationY));
    })
    .onEnd((event) => {
      if (event.translationY > CLOSES_AT || event.velocityY > 800) {
        scheduleOnRN(setLeaving, true);
        leave(event.velocityY);
      } else {
        drag.set(withSpring(0, { ...SETTLE, velocity: event.velocityY }));
      }
    });
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateY: drag.get() }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrim.get() * Math.max(0.15, 1 - drag.get() / 360),
  }));

  const rise = mayMove ? RISE : FadeIn.duration(200);
  const content = (
    <>
      <Text
        accessibilityRole="header"
        allowFontScaling={sizing.allowFontScaling}
        style={[styles.title, { fontSize: sizing.size(22) }]}
      >
        {t('slip.title')}
      </Text>
      <SlipPaper
        taskTitle={taskTitle}
        excuseText={excuseText}
        picked={excuse?.kind === 'picked'}
        graded={graded}
      />
      <View style={styles.excuses}>
        {PICKED_EXCUSES.map((which) => (
          <ExcuseChip
            key={which}
            which={which}
            on={excuse?.kind === 'picked' && excuse.which === which}
            picks={picks}
            label={t(EXCUSE_WORDS[which])}
            onPick={() => {
              setPicks((n) => n + 1);
              setDraft('');
              setExcuse({ kind: 'picked', which });
            }}
          />
        ))}
      </View>
      <TextInput
        testID="slip-write"
        value={draft}
        onChangeText={(words) => {
          setDraft(words);
          setExcuse(words.trim() === '' ? null : { kind: 'written', words });
        }}
        placeholder={t('slip.write')}
        placeholderTextColor={ink.muted}
        allowFontScaling={sizing.allowFontScaling}
        returnKeyType="done"
        style={[styles.write, { fontSize: sizing.size(16) }]}
      />
      <View style={styles.buttons}>
        <PressSpring
          testID="slip-hand-in"
          accessibilityRole="button"
          accessibilityState={{ disabled: graded === null }}
          disabled={graded === null || excuseText === null}
          restOpacity={graded === null ? 0.35 : 1}
          onPress={() => {
            if (graded === null || excuseText === null) return;
            onHandIn(excuseText, graded);
            close();
          }}
          style={[shapes.button, shapes.ink]}
        >
          <Text allowFontScaling={sizing.allowFontScaling} style={buttonText.ink}>
            {t('slip.handIn')}
          </Text>
        </PressSpring>
        <PressSpring
          accessibilityRole="button"
          onPress={() => {
            onStart();
            close();
          }}
          style={styles.startInstead}
        >
          <Text allowFontScaling={sizing.allowFontScaling} style={styles.startText}>
            {t('slip.start')}
          </Text>
        </PressSpring>
      </View>
    </>
  );

  return (
    <View style={StyleSheet.absoluteFill} testID="slip" pointerEvents={leaving ? 'none' : 'auto'}>
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('slip.close')}
          onPress={() => close()}
          style={[StyleSheet.absoluteFill, { backgroundColor: ink.scrim }]}
        />
      </Animated.View>
      <Animated.View
        entering={rise}
        onLayout={(event) => sheetHeight.set(event.nativeEvent.layout.height)}
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            maxHeight: height - insets.top - (largeText ? BUBBLE_ROOM : 56),
          },
          sheetStyle,
        ]}
        accessibilityViewIsModal
      >
        <GestureDetector gesture={pan}>
          <Pressable
            testID="slip-grabber"
            accessibilityRole="button"
            accessibilityLabel={t('slip.close')}
            onPress={() => close()}
            style={styles.grabberZone}
          >
            <View style={shapes.grabber} />
          </Pressable>
        </GestureDetector>
        {largeText ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
            {content}
          </ScrollView>
        ) : (
          <View style={styles.body}>{content}</View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: ink.paper,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    gap: 16,
    boxShadow: '0 -10px 40px rgba(40,28,16,0.18)',
  },
  body: { paddingHorizontal: 20, gap: 16 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  grabberZone: { paddingTop: 8, paddingBottom: 4, alignItems: 'center' },
  title: { fontWeight: '700', color: ink.text, letterSpacing: -0.3 },
  excuses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  write: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: ink.soft,
    color: ink.text,
  },
  buttons: { gap: 2, marginTop: 6 },
  startInstead: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  startText: { ...buttonText.red, color: ink.red },
});
