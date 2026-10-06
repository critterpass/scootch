import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, fontSizes, radius, spacing } from '@scootch/tokens';

import { Scootch } from '../art/Scootch';
import { useT } from '../i18n/i18n-provider';
import { developerToolsAllowed } from '../screens/registry/support/developer-tools';
import {
  useAppearance,
  useForcedVariant,
  useTextSizing,
} from '../screens/registry/support/forced-variant';

// A stand-in until the voice package supplies Scootch's lines.
const SENTENCE = "What's the one thing today?";

/** The canvas Scootch stands in, as the design draws him; narrower on a small phone. */
const SCOOTCH_SIZE = 300;

/** The one screen: one critter, one sentence, one action. */
export default function OneScreen() {
  const palette = colors[useAppearance()];
  const { allowFontScaling, size } = useTextSizing();
  const t = useT();
  const { width } = useWindowDimensions();
  // The way into the developer screens. Never in the store app, and never in a registry capture.
  const captured = useForcedVariant() !== undefined;
  const showDeveloperTools = developerToolsAllowed() && !captured;
  const scootchSize = Math.min(SCOOTCH_SIZE, width - spacing.lg * 2);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.page }]}>
      {showDeveloperTools ? (
        <Link href="/developer-tools" asChild>
          <Pressable accessibilityRole="button" testID="developer-tools" style={styles.developer}>
            <Text style={[styles.developerLabel, { color: palette.muted }]}>Developer tools</Text>
          </Pressable>
        </Link>
      ) : null}
      <View style={styles.middle}>
        <Scootch mood="waiting" size={scootchSize} testID="scootch" />
        <Text
          accessibilityRole="header"
          testID="one-sentence"
          allowFontScaling={allowFontScaling}
          style={[styles.sentence, { color: palette.ink, fontSize: size(fontSizes.sentence) }]}
        >
          {SENTENCE}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        testID="one-action"
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: palette.tomato, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text
          allowFontScaling={allowFontScaling}
          style={[
            styles.actionLabel,
            { color: palette.onTomato, fontSize: size(fontSizes.action) },
          ]}
        >
          {t('session.start')}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.lg,
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  developer: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  developerLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  sentence: {
    fontFamily: fonts.heading,
    fontWeight: '700',
    textAlign: 'center',
  },
  action: {
    minHeight: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  actionLabel: {
    fontFamily: fonts.heading,
    fontWeight: '700',
  },
});
