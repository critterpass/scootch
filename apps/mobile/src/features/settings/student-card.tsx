import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { HAND_FAMILY } from '../../classroom/use-hand-font';
import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

import { Row } from './settings-parts';
import { Barcode, Crest, Photo, Slot } from './student-card-art';

const CARD_BLUE = '#2B5BA8';
const CARD_INK = '#23408A';

/** `2026–27`: the school year, which starts in September. */
export function schoolYear(now: number): string {
  const date = new Date(now);
  const start = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}–${String(start + 1).slice(2)}`;
}

/** The card's number, `1126 0026 2027`: class 11 and the school year's two years. */
export function cardNumber(now: number): string {
  const date = new Date(now);
  const start = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  const yy = String(start % 100).padStart(2, '0');
  return `11${yy} 00${yy} ${start + 1}`;
}

/**
 * The student card from the Settings board: the school's crest, the photo under its seal, the
 * name he calls, the class, the year and the teacher, and the card's barcode.
 */
export function StudentCard({ name, now }: { readonly name: string | null; readonly now: number }) {
  const t = useT();
  const router = useRouter();
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const field = (label: string, value: string) => (
    <View style={styles.field}>
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.fieldLabel, { fontSize: size(9.5) }]}
      >
        {label}
      </Text>
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.fieldValue, { color: palette.ink, fontSize: size(14) }]}
      >
        {value}
      </Text>
    </View>
  );
  return (
    <View
      style={[styles.card, { backgroundColor: palette.surface }]}
      testID="settings-student-card"
    >
      <View style={styles.cardTop}>
        <Crest />
        <View style={styles.cardTopText}>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.cardSchool, { fontSize: size(9.5) }]}
          >
            {t('brand.name')}
          </Text>
          <Text
            accessibilityRole="header"
            allowFontScaling={allowFontScaling}
            style={[styles.cardTitle, { fontSize: size(15) }]}
          >
            {t('settings.card.title')}
          </Text>
        </View>
        <Slot />
      </View>
      <View style={[styles.cardBody, largeText && styles.cardBodyStacked]}>
        <Photo />
        <View style={styles.cardInfo}>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.fieldLabel, { fontSize: size(9.5) }]}
          >
            {t('settings.card.name')}
          </Text>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.cardName, { fontSize: size(25) }]}
            testID="settings-student-name"
          >
            {name ?? t('settings.card.noName')}
          </Text>
          <View style={styles.fields}>
            {field(t('settings.card.class'), '11A')}
            {field(t('settings.card.year'), schoolYear(now))}
            {field(t('settings.card.teacher'), 'Thầy Phú')}
          </View>
          <Barcode number={cardNumber(now)} />
        </View>
      </View>
      <Row
        label={t('settings.card.change')}
        hint={t('settings.card.change.hint')}
        tone="link"
        onPress={() => router.push('/settings/name')}
        testID="settings-change-name"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 22,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(30,50,90,0.06), 0 18px 40px rgba(30,50,90,0.12)',
  },
  cardTop: {
    minHeight: 54,
    backgroundColor: CARD_BLUE,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTopText: { flexShrink: 1 },
  cardSchool: {
    color: '#FFFFFF',
    opacity: 0.8,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  cardBody: { padding: 16, paddingBottom: 14, flexDirection: 'row', gap: 16 },
  cardBodyStacked: { flexDirection: 'column' },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: { marginTop: 2, fontFamily: HAND_FAMILY, color: CARD_INK },
  fields: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 6 },
  field: {},
  fieldLabel: {
    color: '#8A7F74',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  fieldValue: { marginTop: 1, fontWeight: '700' },
});
