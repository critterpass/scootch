import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHandFont } from '../../classroom/use-hand-font';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { GlassSurface } from '../../ui/glass-surface';
import { PhuFigure } from '../board/phu-figure';
import { LockedPanel } from '../tuition/locked-panel';
import { Mark } from '../tuition/marks';
import { Capsule, handText, Label, paper, ReceiptSignature, Sized } from '../tuition/receipt-parts';

import type { ReportCard, Term } from './report-model';
import { monthName, subjectName } from './report-words';

export interface ReportCardViewProps {
  readonly terms: readonly [Term, Term];
  readonly card: ReportCard;
  /** The term has not started: he has nothing to write yet. */
  readonly later: boolean;
  readonly name: string | null;
  /** His comment for the term, from the voice pack; `null` when there is nothing to comment on. */
  readonly comment: string | null;
  /** His conduct mark, the comment ladder's "Good." */
  readonly conduct: string;
  readonly locked: boolean;
  readonly hidden: boolean;
  readonly onTerm: (term: Term) => void;
  readonly onHide: (hidden: boolean) => void;
  /** `null` on a day with something heavy in it: a crisis day shares nothing. */
  readonly onShare: (() => void) | null;
  readonly onBack: () => void;
}

/**
 * The report card (`ReportCard` board): the term's finished tasks under school subjects, the
 * hardest one, his comment and conduct, signed and stamped. No counts and no totals. Task names
 * can be hidden with white-out before sharing. Without tuition it is the quiet lock.
 */
export function ReportCardView(props: ReportCardViewProps) {
  const t = useT();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const hand = useHandFont();
  const { card } = props;
  const tape = props.hidden ? styles.tape : null;

  return (
    <View style={[styles.page, { paddingTop: insets.top }]} testID="report-card">
      <View style={styles.bar}>
        <GlassSurface interactive style={styles.back}>
          <Pressable
            testID="report-card-back"
            accessibilityRole="button"
            accessibilityLabel={t('reportCard.back')}
            onPress={props.onBack}
            style={styles.backPress}
          >
            <Mark name="back" color={paper.ink} size={16} />
          </Pressable>
        </GlassSurface>
        {props.locked ? null : (
          <View style={styles.terms} accessibilityRole="radiogroup">
            {props.terms.map((term) => {
              const on = term.number === card.term.number;
              return (
                <Pressable
                  key={term.number}
                  testID={`report-card-term-${term.number}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => props.onTerm(term)}
                  style={[styles.term, on ? styles.termOn : null]}
                >
                  <Sized size={13} style={styles.termText}>
                    {t('reportCard.term', { number: term.number })}
                  </Sized>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        <Sized size={34} role="header" style={styles.title}>
          {t('reportCard.title')}
        </Sized>
        {props.locked ? (
          <LockedPanel style={styles.locked} testID="report-card-lock" />
        ) : (
          <>
            <View style={styles.sheet} accessibilityLabel={t('reportCard.title')}>
              <View style={styles.stripe} />
              <View style={styles.head}>
                <View style={styles.headRow}>
                  <Label color={paper.blue}>{t('reportCard.heading')}</Label>
                  <Label>
                    {t('reportCard.termYear', { number: card.term.number, years: card.term.years })}
                  </Label>
                </View>
                <View style={styles.nameRow}>
                  <Sized size={12} style={styles.muted}>
                    {t('reportCard.name')}
                  </Sized>
                  <Sized size={20} style={[handText, styles.name]} lines={1}>
                    {props.name ?? ' '}
                  </Sized>
                  <Sized size={12} style={styles.muted}>
                    {t('reportCard.class')}
                  </Sized>
                </View>
              </View>
              {props.later || card.empty ? (
                <View style={styles.later} testID="report-card-later">
                  <View accessibilityElementsHidden style={styles.laterPhu}>
                    <PhuFigure mood="grading" width={110} hand={hand} />
                  </View>
                  {props.later ? (
                    <Sized size={17} style={styles.laterTitle}>
                      {t('reportCard.laterTitle', {
                        number: card.term.number,
                        month: monthName(card.term.from, language),
                      })}
                    </Sized>
                  ) : null}
                  <Sized size={14} style={styles.laterBody}>
                    {t('reportCard.laterBody')}
                  </Sized>
                </View>
              ) : (
                <View style={styles.inside}>
                  <View style={styles.section}>
                    <Label>{t('reportCard.handedIn')}</Label>
                    {card.lines.map((line) => (
                      <View key={line.subject} style={styles.subjectRow}>
                        <Sized size={14} style={styles.subject}>
                          {subjectName(line.subject, t)}
                        </Sized>
                        <Sized size={16} lines={2} style={[handText, styles.examples, tape]}>
                          {line.examples.join(', ')}
                        </Sized>
                      </View>
                    ))}
                  </View>
                  {card.hardest !== null ? (
                    <View style={styles.hardest}>
                      <Label>{t('reportCard.hardest')}</Label>
                      <Sized size={14.5} style={[styles.hardestText, tape]}>
                        {card.hardest.text}
                      </Sized>
                      <Sized size={12.5} style={styles.muted}>
                        {card.hardest.waitedDays === 0
                          ? t('finish.sameDay')
                          : t('finish.waited', { count: card.hardest.waitedDays })}
                        {'. '}
                        {t('finish.took', { count: card.hardest.tookMinutes })}
                        {'.'}
                      </Sized>
                    </View>
                  ) : null}
                  {props.comment !== null ? (
                    <View style={styles.section}>
                      <Label>{t('reportCard.comment')}</Label>
                      <Sized size={18} style={[handText, styles.comment]}>
                        {props.comment}
                      </Sized>
                    </View>
                  ) : null}
                  <View style={styles.foot}>
                    <View style={styles.conduct}>
                      <Label>{t('reportCard.conduct')}</Label>
                      <Sized size={22} style={[handText, styles.conductMark]}>
                        {props.conduct}
                      </Sized>
                    </View>
                    <View style={styles.signed}>
                      <ReceiptSignature label={t('tuition.signature')} />
                      <Label>{t('class.homeroomTeacher').toLocaleUpperCase(language)}</Label>
                    </View>
                  </View>
                </View>
              )}
            </View>
            {!props.later && !card.empty ? (
              <>
                <View style={styles.hideRow}>
                  <Sized size={14.5} style={styles.hideText}>
                    {t('reportCard.hide')}
                  </Sized>
                  <Switch
                    testID="report-card-hide"
                    accessibilityLabel={t('reportCard.hide')}
                    value={props.hidden}
                    onValueChange={props.onHide}
                  />
                </View>
                {props.onShare !== null ? (
                  <Capsule
                    testID="report-card-share"
                    label={t('reportCard.share')}
                    tone="ink"
                    onPress={props.onShare}
                  />
                ) : null}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: paper.page },
  bar: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { width: 40, height: 40, borderRadius: 20 },
  backPress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  terms: {
    flexDirection: 'row',
    gap: 2,
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.66)',
  },
  term: { minHeight: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: 'center' },
  termOn: { backgroundColor: paper.white, boxShadow: '0 2px 6px rgba(60,40,20,0.12)' },
  termText: { fontWeight: '600', color: paper.ink },
  scroll: { paddingHorizontal: 16, gap: 14 },
  title: { fontWeight: '800', letterSpacing: -0.8, color: paper.ink, paddingHorizontal: 4 },
  locked: { marginTop: 40 },
  sheet: {
    borderRadius: 8,
    backgroundColor: paper.sheet,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(60,40,20,0.06), 0 20px 44px rgba(60,40,20,0.11)',
    paddingBottom: 16,
  },
  stripe: { height: 8, backgroundColor: paper.blue, borderBottomWidth: 4, borderColor: paper.red },
  head: { paddingHorizontal: 18, paddingTop: 14, gap: 6 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  name: {
    flex: 1,
    minWidth: 120,
    color: paper.ink,
    borderBottomWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: 'rgba(28,26,24,0.22)',
  },
  muted: { color: paper.muted },
  inside: { paddingHorizontal: 18, paddingTop: 14, gap: 12 },
  section: { gap: 6 },
  subjectRow: {
    gap: 2,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(28,26,24,0.12)',
  },
  subject: { fontWeight: '700', color: paper.ink },
  examples: { color: paper.blue },
  tape: { color: '#FBF8F1', backgroundColor: '#FBF8F1', borderRadius: 3, overflow: 'hidden' },
  hardest: { padding: 12, borderRadius: 12, backgroundColor: paper.faint, gap: 2 },
  hardestText: { fontWeight: '700', color: paper.ink },
  comment: { color: paper.redDeep, lineHeight: 24 },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  conduct: { gap: 4 },
  conductMark: { color: paper.redDeep },
  signed: { alignItems: 'flex-end' },
  later: { alignItems: 'center', gap: 6, paddingHorizontal: 30, paddingVertical: 36 },
  laterPhu: { width: 110, height: 121, overflow: 'hidden' },
  laterTitle: { fontWeight: '700', color: paper.ink, textAlign: 'center' },
  laterBody: { color: '#6B655E', textAlign: 'center', lineHeight: 20 },
  hideRow: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: paper.white,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hideText: { flex: 1, color: paper.ink },
});
