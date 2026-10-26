import type { ReactNode } from 'react';
import { Image, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import appIcon from '../../../assets/icons/app.png';
import { useT } from '../../i18n/i18n-provider';
import { titleSize, TITLE_MAX_SCALE } from '../settings/settings-parts';
import { useKeyboardOpen } from '../../ui/use-keyboard-open';
import { useScreenStyle } from '../../ui/use-screen-style';

import type { Beat } from './first-day-screen';
import { CLASS_RED, styles } from './first-day-styles';

/** The App board's sheet: 374 points of an 844-point screen, its action at the foot. */
const SHEET_HEIGHT = 374;
/** His bubble grows only so far: at the largest sizes the sheet below carries the words. */
const BUBBLE_MAX_SCALE = 1.6;

/** His speech bubble, over the room. */
export function Bubble({ text, wide }: { readonly text: string; readonly wide: boolean }) {
  const insets = useSafeAreaInsets();
  const { allowFontScaling, size, reducedMotion, largeText } = useScreenStyle();
  if (text === '') return null;
  return (
    <Animated.View
      key={text}
      {...(reducedMotion ? {} : { entering: FadeIn.duration(300) })}
      accessibilityLiveRegion="polite"
      style={[
        styles.bubble,
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

/** The sheet at the foot of the room that each beat writes on. */
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
    <Animated.View
      key={beat}
      {...(reducedMotion ? {} : { entering: FadeInDown.duration(420) })}
      style={[
        styles.sheet,
        {
          backgroundColor: light ? 'rgba(255,253,249,0.97)' : palette.surface,
          // With the keyboard up the sheet is only as tall as what is on it, so the room shows.
          minHeight: keyboardOpen ? 0 : Math.min(SHEET_HEIGHT, height * 0.72),
          maxHeight: height * 0.72,
        },
      ]}
      testID={`first-day-beat-${beat.replace(' ', '-')}`}
    >
      <View style={styles.grabber} />
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
