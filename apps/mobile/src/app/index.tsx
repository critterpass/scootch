import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, fontSizes, radius, spacing } from '@scootch/tokens';

import { Scootch } from '../art/Scootch';

// Stand-ins until the voice package supplies Scootch's lines.
const SENTENCE = "What's the one thing today?";
const ACTION = 'Start';

/** The canvas Scootch stands in, as the design draws him; narrower on a small phone. */
const SCOOTCH_SIZE = 300;

/** The one screen: one critter, one sentence, one action. */
export default function OneScreen() {
  const palette = colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { width } = useWindowDimensions();
  const scootchSize = Math.min(SCOOTCH_SIZE, width - spacing.lg * 2);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.page }]}>
      <View style={styles.middle}>
        <Scootch mood="waiting" size={scootchSize} testID="scootch" />
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
