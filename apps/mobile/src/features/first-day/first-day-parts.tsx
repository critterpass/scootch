import type { ReactNode } from 'react';
import { Image, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import appIcon from '../../../assets/icons/app.png';
import { useT } from '../../i18n/i18n-provider';
import { titleSize, TITLE_MAX_SCALE } from '../settings/settings-parts';
import { BOUNCE_CURVE, CSS_EASE, CROSSFADE_MS, SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { useKeyboardOpen } from '../../ui/use-keyboard-open';
import { useScreenStyle } from '../../ui/use-screen-style';

import type { Beat } from './first-day-screen';
import { CLASS_RED, styles } from './first-day-styles';

/** The App board's sheet: 374 points of an 844-point screen, its action at the foot. */
const SHEET_HEIGHT = 374;
/** Each beat's words fill the sheet, and scroll inside it when they are more than it holds. */
const SWAP = { flexGrow: 1, flexShrink: 1 } as const;
/** His bubble grows only so far: at the largest sizes the sheet below carries the words. */
const BUBBLE_MAX_SCALE = 1.6;

/** The App board's bubble pop: from 60% and a little low, overshooting into place. */
function bubblePop() {
  'worklet';
  const timing = { duration: 400, easing: BOUNCE_CURVE };
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.6 }, { translateY: 10 }] },
    animations: {
      opacity: withTiming(1, timing),
      transform: [{ scale: withTiming(1, timing) }, { translateY: withTiming(0, timing) }],
    },
  };
}

/**
 * The App board's panel swap, coming in: opacity over 300 ms `ease`, and up 10 points from 0.985
 * over 520 ms on the interface curve, 140 ms after the old panel starts to go.
 */
function panelIn() {
  'worklet';
  const move = { duration: 520, easing: SPRING_CURVE };
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 10 }, { scale: 0.985 }] },
    animations: {
      opacity: withDelay(140, withTiming(1, { duration: 300, easing: CSS_EASE })),
      transform: [
        { translateY: withDelay(140, withTiming(0, move)) },
        { scale: withDelay(140, withTiming(1, move)) },
      ],
    },
  };
}

/** The panel swap, going: the reverse, at once. */
function panelOut() {
  'worklet';
  const move = { duration: 520, easing: SPRING_CURVE };
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    animations: {
      opacity: withTiming(0, { duration: 300, easing: CSS_EASE }),
      transform: [{ translateY: withTiming(10, move) }, { scale: withTiming(0.985, move) }],
    },
  };
}

/** His speech bubble, over the room. */
export function Bubble({ text, wide }: { readonly text: string; readonly wide: boolean }) {
  const insets = useSafeAreaInsets();
  const { allowFontScaling, size, reducedMotion, largeText } = useScreenStyle();
  if (text === '') return null;
  return (
    <Animated.View
      key={text}
      entering={reducedMotion ? FadeIn.duration(CROSSFADE_MS) : bubblePop}
      accessibilityLiveRegion="polite"
      style={[
        styles.bubble,
        // It grows from the corner nearest him.
        { transformOrigin: wide ? '20% 100%' : '80% 100%' },
        { top: insets.top + (wide ? 16 : 70), maxWidth: largeText ? '88%' : 220 },
        wide ? { left: 22 } : { right: 22 },
      ]}
    >
      <Text
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={BUBBLE_MAX_SCALE}
        style={[styles.bubbleText, { fontSize: Math.min(size(16), 16 * BUBBLE_MAX_SCALE) }]}
        accessibilityRole="text"
        testID="first-day-line"
      >
        {text}
      </Text>
    </Animated.View>
  );
}

/**
 * The sheet at the foot of the room that each beat writes on. The sheet stays; each beat's words
 * swap on it, the old going as the new comes in.
 */
export function Sheet({
  label,
  trailing,
  children,
  beat,
  quietLabel = false,
}: {
  readonly label: string;
  /** The desk's label is the page's muted ink, not the first day's red. */
  readonly quietLabel?: boolean;
  readonly trailing?: ReactNode;
  readonly children: ReactNode;
  readonly beat: Beat;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { palette, allowFontScaling, size, reducedMotion } = useScreenStyle();
  const keyboardOpen = useKeyboardOpen();
  const light = palette.ink === '#1C1A17';
  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: light ? 'rgba(255,253,249,0.97)' : palette.surface,
          // With the keyboard up the sheet is only as tall as what is on it, so the room shows.
          minHeight: keyboardOpen ? 0 : Math.min(SHEET_HEIGHT, height * 0.72),
          maxHeight: height * 0.72,
        },
      ]}
    >
      <View style={styles.grabber} />
      <Animated.View
        key={beat}
        entering={reducedMotion ? FadeIn.duration(CROSSFADE_MS) : panelIn}
        exiting={reducedMotion ? FadeOut.duration(CROSSFADE_MS) : panelOut}
        style={SWAP}
        testID={`first-day-beat-${beat.replace(' ', '-')}`}
      >
        <ScrollView
          style={styles.sheetScroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 16 }]}
        >
          <View style={styles.sheetHead}>
            <Text
              allowFontScaling={allowFontScaling}
              style={[
                styles.label,
                { color: quietLabel ? palette.muted : CLASS_RED, fontSize: size(12) },
              ]}
            >
              {label}
            </Text>
            {trailing}
          </View>
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

export function Heading({ children }: { readonly children: string }) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <Text
      accessibilityRole="header"
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={TITLE_MAX_SCALE}
      style={[styles.heading, { color: palette.ink, fontSize: titleSize(size, 26) }]}
    >
      {children}
    </Text>
  );
}

export function Body({ children }: { readonly children: string }) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <Text
      allowFontScaling={allowFontScaling}
      style={[styles.body, { color: palette.muted, fontSize: size(16) }]}
    >
      {children}
    </Text>
  );
}

/** One of his notes as it would arrive, about a real kind of task. */
export function ExampleNote({ body }: { readonly body: string }) {
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <View
      accessible
      accessibilityLabel={`Thầy Phú, ${t('firstDay.notes.now')}. ${body}`}
      style={[styles.note, { backgroundColor: palette.surface }]}
      testID="first-day-example-note"
    >
      <Image source={appIcon} style={styles.noteIcon} />
      <View style={styles.noteText}>
        <View style={styles.noteHead}>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.noteFrom, { color: palette.ink, fontSize: size(14) }]}
          >
            Thầy Phú
          </Text>
          <Text
            allowFontScaling={allowFontScaling}
            style={{ color: palette.muted, fontSize: size(12) }}
          >
            {t('firstDay.notes.now')}
          </Text>
        </View>
        <Text
          allowFontScaling={allowFontScaling}
          style={{ color: palette.ink, fontSize: size(14) }}
        >
          {body}
        </Text>
      </View>
    </View>
  );
}
