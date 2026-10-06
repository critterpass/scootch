import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, fontSizes, spacing } from '@scootch/tokens';

import { useT } from '../i18n/i18n-provider';
import { useAppearance } from '../screens/registry/support/forced-variant';
import { useSession } from '../state/day-store-provider';

/**
 * Where a started session lands until the session screens exist: the day store's session, shown
 * as plain values. It has no controls of its own.
 */
export default function SessionPlaceholder() {
  const palette = colors[useAppearance()];
  const { session } = useSession();
  const t = useT();
  const live = session && session.phase !== 'let_go' ? session : null;
  const values = [
    session?.phase ?? '-',
    live ? t('taskSet.minutes', { minutes: live.ask.minutes }) : '-',
    live?.endsAt ? new Date(live.endsAt).toISOString() : '-',
    live?.treat ?? '-',
  ];

  return (
    <SafeAreaView testID="session" style={[styles.page, { backgroundColor: palette.page }]}>
      {values.map((value, index) => (
        <Text
          key={index}
          testID={`session-value-${index}`}
          style={[styles.value, { color: palette.ink }]}
        >
          {value}
        </Text>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  value: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
  },
});
