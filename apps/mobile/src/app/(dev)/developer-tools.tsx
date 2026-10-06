import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Language } from '@scootch/i18n';
import { colors, fonts, fontSizes, radius, spacing, type Palette } from '@scootch/tokens';

import { shortSession } from '../../features/session/dev/short-session';
import { useLanguage } from '../../i18n/i18n-provider';
import { useDispatch, useToday } from '../../state/day-store-provider';

const SCREENS: readonly { id: string; label: string; href: Href }[] = [
  { id: 'dev-open-registry', label: 'Screen registry', href: '/registry' },
  { id: 'dev-open-characters', label: 'Character gallery', href: '/characters' },
];

const LANGUAGE_CHOICES: readonly { id: string; label: string; language: Language | null }[] = [
  { id: 'dev-language-device', label: "Follow the phone's language", language: null },
  { id: 'dev-language-en', label: 'English', language: 'en' },
  { id: 'dev-language-vi', label: 'Tiếng Việt', language: 'vi' },
];

function Row({ id, label, selected, palette, onPress }: RowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={selected === undefined ? {} : { selected }}
      testID={id}
      onPress={onPress}
      style={[styles.row, { backgroundColor: palette.surface }]}
    >
      <Text style={[styles.rowLabel, { color: palette.ink }]}>{label}</Text>
      {selected ? <Text style={[styles.rowLabel, { color: palette.tomato }]}>✓</Text> : null}
    </Pressable>
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
 * The list of developer screens, reached from the "Developer tools" entry on the one screen. The
 * language switch and the finish method here stand in until the Settings screen has its own; the
 * control that ends a session soon exists only for device flows.
 */
export default function DeveloperTools() {
  const palette = colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const { language, chosen, choose } = useLanguage();
  const [shortSessions, setShortSessions] = useState(shortSession.isArmed);
  const dispatch = useDispatch();
  const tapTwice = useToday().settings.finishWith === 'double_tap';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.page }]}>
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

        <Text style={[styles.heading, { color: palette.muted }]}>Session</Text>
        <Row
          id="dev-short-session"
          label="Show the control that ends a session soon"
          selected={shortSessions}
          palette={palette}
          onPress={() => {
            shortSession.arm(!shortSessions);
            setShortSessions(!shortSessions);
          }}
        />
        <Row
          id="dev-finish-tap-twice"
          label="Finish with two taps"
          selected={tapTwice}
          palette={palette}
          onPress={() =>
            void dispatch({
              type: 'settings_changed',
              changes: { finishWith: tapTwice ? 'hold' : 'double_tap' },
            }).catch(() => undefined)
          }
        />

        <Link href="/" replace asChild>
          <Row id="dev-close" label="Back to the one screen" palette={palette} />
        </Link>
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
