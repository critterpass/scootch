import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts } from '@phusclass/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import type { PaperInks } from '../board/chalk';

const MARGIN = 56;

/**
 * The way into the report card, at the foot of the logbook: one quiet ruled line in the page's
 * own ink, as plain as the report card itself. Without tuition it says so and opens the lock.
 */
export function ReportCardRow({
  ink,
  enrolled,
  onPress,
}: {
  readonly ink: PaperInks;
  readonly enrolled: boolean;
  readonly onPress: () => void;
}) {
  const t = useT();
  const { size, allowFontScaling } = useScreenStyle();
  const note = enrolled ? t('logbook.reportCard.note') : t('locked.title');
  return (
    <Pressable
      testID="logbook-report-card"
      accessibilityRole="link"
      accessibilityLabel={`${t('logbook.reportCard')}, ${note}`}
      accessibilityHint={t('logbook.reportCard.hint')}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderTopColor: ink.rule }, pressed && styles.pressed]}
    >
      <View style={styles.words}>
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.label, { color: ink.ink, fontSize: size(16) }]}
        >
          {t('logbook.reportCard')}
        </Text>
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.note, { color: ink.muted, fontSize: size(12.5) }]}
        >
          {note}
        </Text>
      </View>
      <View style={[styles.chevron, { borderColor: ink.muted }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 28,
    minHeight: 66,
    paddingLeft: MARGIN + 16,
    paddingRight: 26,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pressed: { opacity: 0.6 },
  words: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.body, fontWeight: '700' },
  note: { fontFamily: fonts.body },
  chevron: {
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
});
