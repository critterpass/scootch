import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, fontSizes, radius, spacing } from '@scootch/tokens';

// Stand-ins until the voice package supplies Scootch's lines.
const SENTENCE = "What's the one thing today?";
const ACTION = 'Start';

const CRITTER_SIZE = 120;
const BLOB_SIZE = 220;

/** The one screen: one critter, one sentence, one action. */
export default function OneScreen() {
  const palette = colors[useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.page }]}>
      <View style={styles.middle}>
        {/* Placeholder critter: a plain tomato shape on the riso blob, until the art arrives. */}
        <View
          testID="critter-placeholder"
          style={[styles.blob, { backgroundColor: palette.risoBlob }]}
        >
          <View style={[styles.critter, { backgroundColor: palette.tomato }]} />
        </View>
        <Text
          accessibilityRole="header"
          testID="one-sentence"
          style={[styles.sentence, { color: palette.ink }]}
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
        <Text style={[styles.actionLabel, { color: palette.onTomato }]}>{ACTION}</Text>
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
  blob: {
    width: BLOB_SIZE,
    height: BLOB_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  critter: {
    width: CRITTER_SIZE,
    height: CRITTER_SIZE,
    borderRadius: radius.lg,
  },
  sentence: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sentence,
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
    fontSize: fontSizes.action,
    fontWeight: '700',
  },
});
