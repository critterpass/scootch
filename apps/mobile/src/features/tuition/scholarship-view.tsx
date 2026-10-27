import { localDateTime, type Instant } from '@phusclass/domain';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHandFont } from '../../classroom/use-hand-font';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { RiseIn } from '../../ui/motion/rise-in';
import { StampIn } from '../../ui/motion/stamp-in';
import { PhuFigure } from '../board/phu-figure';

import { Capsule, handText, Label, paper, ReceiptSignature, Sized } from './receipt-parts';
import { receiptDay } from './tuition-dates';

export interface ScholarshipViewProps {
  readonly state: 'asking' | 'sending' | 'failed' | 'granted';
  /** The full name from roll call, written on the certificate. */
  readonly name: string | null;
  readonly now: Instant;
  readonly timeZone: string;
  /** His line when it is granted, from the voice pack. */
  readonly line: string | null;
  /** The note typed so far, kept on the phone; starts empty. */
  readonly initialNote?: string;
  readonly onAsk: (note: string) => void;
  readonly onBack: () => void;
}

/** The school year a day falls in, "2026–27": it begins with khai giảng in September. */
export function schoolYearOf(day: string): string {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  const from = month >= 8 ? year : year - 1;
  return `${from}–${String((from + 1) % 100).padStart(2, '0')}`;
}

/**
 * "Can't pay right now?": one tap and an optional note ask for a free school year, with no proof;
 * once granted, the certificate with his red APPROVED stamp. Drawn from props for the registry.
 */
export function ScholarshipView(props: ScholarshipViewProps) {
  const t = useT();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const sizing = useTextSizing();
  const hand = useHandFont();
  const [note, setNote] = useState(props.initialNote ?? '');
  const today = localDateTime(props.now, props.timeZone).date;

  if (props.state === 'granted') {
    return (
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        testID="scholarship-granted"
      >
        <RiseIn style={styles.certificate}>
          <View style={styles.certificateInner}>
            <Label color={paper.amber}>
              {t('scholarship.class', { brand: t('brand.name').toLocaleUpperCase(language) })}
            </Label>
            <Sized size={40} role="header" style={[handText, styles.certificateTitle]}>
              {t('scholarship.certificate')}
            </Sized>
            <Sized size={13} style={styles.muted}>
              {t('scholarship.awardedTo')}
            </Sized>
            <Sized size={26} style={[handText, styles.name]}>
              {props.name ?? ' '}
            </Sized>
            <Sized size={14} style={styles.forYear}>
              {t('scholarship.forYear', { years: schoolYearOf(today) })}
            </Sized>
            <View style={styles.certificateFoot}>
              <Label>{receiptDay(today, '', language)}</Label>
              <View style={styles.signed}>
                <ReceiptSignature label={t('tuition.signature')} />
                <Label>{t('class.homeroomTeacher').toLocaleUpperCase(language)}</Label>
              </View>
            </View>
            <StampIn delayMs={260} restDeg={12} style={styles.approvedSpot}>
              <View
                accessible
                accessibilityLabel={t('scholarship.approved')}
                style={styles.approved}
              >
                <Sized size={15} style={[handText, styles.approvedText]} lines={2}>
                  {t('scholarship.approved')}
                </Sized>
              </View>
            </StampIn>
          </View>
        </RiseIn>
        {props.line !== null ? (
          <View style={styles.said}>
            <View accessibilityElementsHidden style={styles.smallPhu}>
              <PhuFigure mood="approve" width={64} hand={hand} />
            </View>
            <Sized size={17} style={styles.saidText}>
              {props.line}
            </Sized>
          </View>
        ) : null}
        <Capsule
          testID="scholarship-back"
          label={t('scholarship.back')}
          tone="green"
          onPress={props.onBack}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      testID="scholarship"
    >
      <View style={styles.askHead}>
        <Sized size={28} role="header" style={styles.title}>
          {t('scholarship.title')}
        </Sized>
        <View accessibilityElementsHidden style={styles.phu}>
          <PhuFigure mood="calm" width={88} hand={hand} />
        </View>
      </View>
      <Sized size={15.5} style={styles.body}>
        {t('scholarship.body')}
      </Sized>
      <View style={styles.field}>
        <Label>{t('scholarship.noteLabel').toLocaleUpperCase(language)}</Label>
        <TextInput
          testID="scholarship-note"
          accessibilityLabel={t('scholarship.noteLabel')}
          value={note}
          onChangeText={setNote}
          placeholder={t('scholarship.notePlaceholder')}
          placeholderTextColor="#B0A69B"
          multiline
          maxLength={280}
          allowFontScaling={sizing.allowFontScaling}
          style={[styles.input, { fontSize: sizing.size(16) }]}
        />
      </View>
      {props.state === 'failed' ? (
        <Sized size={13} style={styles.failed} role="text">
          {t('scholarship.failed')}
        </Sized>
      ) : null}
      <View style={styles.askFoot}>
        <Capsule
          testID="scholarship-ask"
          label={t('scholarship.ask')}
          tone="ink"
          disabled={props.state === 'sending'}
          onPress={() => props.onAsk(note)}
        />
        <Sized size={12.5} style={styles.blank}>
          {t('scholarship.blank')}
        </Sized>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#FFFDF8' },
  content: { paddingHorizontal: 22, paddingTop: 30, gap: 16 },
  askHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  title: { flex: 1, fontWeight: '800', letterSpacing: -0.5, color: paper.ink },
  phu: { width: 88, height: 98, overflow: 'hidden' },
  body: { color: '#4A443E', lineHeight: 23 },
  field: { gap: 8, marginTop: 4 },
  input: {
    minHeight: 104,
    borderRadius: 18,
    backgroundColor: paper.white,
    boxShadow: 'inset 0 0 0 1.5px rgba(28,26,24,0.10)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    color: paper.ink,
    textAlignVertical: 'top',
  },
  failed: { color: paper.red, textAlign: 'center' },
  askFoot: { gap: 10, marginTop: 8 },
  blank: { color: paper.muted, textAlign: 'center' },
  muted: { color: '#6B655E' },
  certificate: {
    borderRadius: 10,
    backgroundColor: paper.goldSoft,
    borderWidth: 2,
    borderColor: paper.gold,
    padding: 4,
    boxShadow: '0 10px 26px rgba(60,40,20,0.10)',
  },
  certificateInner: {
    borderWidth: 1.5,
    borderColor: paper.gold,
    borderRadius: 6,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
    alignItems: 'center',
    gap: 4,
  },
  certificateTitle: { color: paper.redDeep, marginTop: 4, textAlign: 'center' },
  name: {
    color: paper.ink,
    borderBottomWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: 'rgba(28,26,24,0.25)',
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  forYear: { color: '#3E3933', marginTop: 8, textAlign: 'center' },
  certificateFoot: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 18,
  },
  signed: { alignItems: 'flex-end' },
  approvedSpot: { position: 'absolute', bottom: 6, alignSelf: 'center' },
  approved: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: paper.red,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  approvedText: { color: paper.red, textAlign: 'center' },
  said: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  smallPhu: { width: 64, height: 70, overflow: 'hidden' },
  saidText: { flex: 1, fontWeight: '800', color: paper.ink, lineHeight: 23 },
});
