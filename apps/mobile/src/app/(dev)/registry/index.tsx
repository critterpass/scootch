import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, fontSizes, radius, spacing } from '@scootch/tokens';

import { captures } from '../../../screens/registry/support/all-states';

/**
 * Every registered screen state in every variant it must be captured in. A row's button opens
 * that state full screen with the variant forced.
 *
 * Ids: `registry-row-<state>--<variant>` is a row's button and never changes for that capture.
 * `registry-count` holds the number of rows and `registry-name-<n>` holds the n-th row's name, so
 * a device flow can walk the list without knowing what is registered.
 */
export default function RegistryBrowser() {
  const palette = colors[useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.page }]}>
      <ScrollView testID="registry-list" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: palette.ink }]}>
            Screen registry
          </Text>
          <Text testID="registry-count" style={[styles.title, { color: palette.muted }]}>
            {String(captures.length)}
          </Text>
        </View>
        {captures.map((capture, index) => (
          <View key={capture.name} style={[styles.row, { backgroundColor: palette.surface }]}>
            <Text
              testID={`registry-name-${index}`}
              style={[styles.name, { color: palette.ink }]}
              numberOfLines={2}
            >
              {capture.name}
            </Text>
            <Link
              href={{ pathname: '/registry/[capture]', params: { capture: capture.name } }}
              asChild
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${capture.name}`}
                testID={`registry-row-${capture.name}`}
                style={[styles.open, { backgroundColor: palette.tomato }]}
              >
                <Text style={[styles.openLabel, { color: palette.onTomato }]}>Open</Text>
              </Pressable>
            </Link>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.action,
    fontWeight: '700',
  },
  row: {
    minHeight: 56,
    borderRadius: radius.pill,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  open: {
    minHeight: 44,
    minWidth: 72,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  openLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    fontWeight: '600',
  },
});
