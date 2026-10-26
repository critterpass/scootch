import { Link, type Href } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';

import type { Language } from '@phusclass/i18n';
import { colors, fonts, fontSizes, radius, spacing, type Palette } from '@phusclass/tokens';

import { PRETEND_OFFLINE, pretendOffline } from '../../features/offline/pretend-offline';
import { useLanguage } from '../../i18n/i18n-provider';
import { SafeFrame } from '../../ui/safe-frame';
import { PressSpring } from '../../ui/motion/press-spring';

const SCREENS: readonly { id: string; label: string; href: Href }[] = [
  { id: 'dev-open-registry', label: 'Screen registry', href: '/registry' },
  { id: 'dev-open-classroom', label: 'Classroom', href: '/dev-classroom' },
];

const LANGUAGE_CHOICES: readonly { id: string; label: string; language: Language | null }[] = [
  { id: 'dev-language-device', label: "Follow the phone's language", language: null },
  { id: 'dev-language-en', label: 'English', language: 'en' },
  { id: 'dev-language-vi', label: 'Tiếng Việt', language: 'vi' },
];

const subscribeOffline = (changed: () => void) => pretendOffline.subscribe(changed);

function Row({ id, label, selected, palette, onPress }: RowProps) {
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityState={selected === undefined ? {} : { selected }}
      testID={id}
      onPress={onPress}
      style={[styles.row, { backgroundColor: palette.surface }]}
    >
      <Text style={[styles.rowLabel, { color: palette.ink }]}>{label}</Text>
      {selected ? <Text style={[styles.rowLabel, { color: palette.tomato }]}>✓</Text> : null}
    </PressSpring>
  );
}

interface RowProps {
  readonly id: string;
  readonly label: string;
  readonly selected?: boolean;
  readonly palette: Palette;
  readonly onPress?: () => void;
}

/**
 * The list of developer screens, opened by its link in the developer app. The switch that
 * pretends there is no connection exists only here.
 */
export default function DeveloperTools() {
  const palette = colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { language, chosen, choose } = useLanguage();
  const offline = useSyncExternalStore(subscribeOffline, pretendOffline.isOn, pretendOffline.isOn);

  return (
    <SafeFrame style={[styles.screen, { backgroundColor: palette.page }]}>
      <ScrollView testID="developer-tools-list" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: palette.ink }]}>
          Developer tools
        </Text>
        {SCREENS.map((screen) => (
          <Link key={screen.id} href={screen.href} asChild>
            <Row id={screen.id} label={screen.label} palette={palette} />
          </Link>
        ))}

        <Text style={[styles.heading, { color: palette.muted }]}>Language</Text>
        <View style={styles.group}>
          {LANGUAGE_CHOICES.map((choice) => (
            <Row
              key={choice.id}
              id={choice.id}
              label={choice.label}
              selected={choice.language === chosen}
              palette={palette}
              onPress={() => void choose(choice.language).catch(() => undefined)}
            />
          ))}
        </View>
        <Text testID="dev-language-current" style={[styles.note, { color: palette.muted }]}>
          {`Showing: ${language}`}
        </Text>

        <Text style={[styles.heading, { color: palette.muted }]}>Connection</Text>
        <Row
          id="dev-pretend-offline"
          label={PRETEND_OFFLINE.label}
          selected={offline}
          palette={palette}
          onPress={() => pretendOffline.set(!offline)}
        />

        <Link href="/" replace asChild>
          <Row id="dev-close" label="Back to the desk" palette={palette} />
        </Link>
      </ScrollView>
    </SafeFrame>
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
  group: {
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.sentence,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  heading: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: spacing.md,
  },
  row: {
    minHeight: 52,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: spacing.md,
  },
});
