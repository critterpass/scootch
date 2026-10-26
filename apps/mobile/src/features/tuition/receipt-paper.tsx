import { Pressable, StyleSheet, View } from 'react-native';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { StampIn } from '../../ui/motion/stamp-in';

import { PLANS, type PlanId } from './products';
import type { Offerings } from './purchases-port';
import type { ReceiptStage } from './receipt-model';
import { handText, Label, paper, ReceiptSignature, RedTick, Sized } from './receipt-parts';

export interface ReceiptStamp {
  readonly word: string;
  readonly sub: string;
  readonly color: string;
  readonly big: boolean;
}

export interface ReceiptPaperProps {
  readonly stage: ReceiptStage;
  readonly plan: PlanId;
  readonly offerings: Offerings | null;
  readonly name: string | null;
  /** How much less the school year costs than twelve months, in percent. */
  readonly saving: number | null;
  readonly stamp: ReceiptStamp | null;
  readonly onPick: (plan: PlanId) => void;
}

/**
 * The receipt itself: what tuition opens, each line ticked in red; the two plans with the school
 * year first and the store's own prices; the amount in his hand, his signature, and the stamp.
 */
export function ReceiptPaper(props: ReceiptPaperProps) {
  const t = useT();
  const { language } = useLanguage();
  const { stage, offerings } = props;
  const choosing = stage === 'offer' || stage === 'failed';
  const chosen = offerings?.plans[props.plan];
  const lines = [
    t('tuition.line.timetable'),
    t('tuition.line.widgets'),
    t('tuition.line.reportCard'),
    t('tuition.line.later'),
  ];

  return (
    <View style={styles.paper} accessibilityLabel={t('tuition.receipt')} testID="tuition-receipt">
      <View style={styles.head}>
        <Label color={paper.red}>{t('tuition.receipt').toLocaleUpperCase(language)}</Label>
        <View style={styles.nameRow}>
          <Sized size={12} style={styles.muted}>
            {t('tuition.name')}
          </Sized>
          <Sized size={19} style={[handText, styles.name]} lines={1}>
            {props.name ?? ' '}
          </Sized>
        </View>
      </View>
      <View style={styles.dash} />
      <View style={styles.lines}>
        {lines.map((line) => (
          <View key={line} style={styles.lineRow}>
            <Sized size={14} style={styles.lineText}>
              {line}
            </Sized>
            <View style={styles.leader} />
            <RedTick />
          </View>
        ))}
      </View>
      <View style={styles.dash} />
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('tuition.howToPay')}
        style={styles.plans}
      >
        {PLANS.map((plan) => {
          const offer = offerings?.plans[plan];
          const on = props.plan === plan;
          return (
            <Pressable
              key={plan}
              testID={`tuition-plan-${plan}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: offer === undefined || !choosing }}
              disabled={offer === undefined || !choosing}
              onPress={() => props.onPick(plan)}
              style={[
                styles.plan,
                on ? styles.planOn : styles.planOff,
                !choosing && !on ? styles.planDim : null,
              ]}
            >
              <View style={styles.planHead}>
                <Sized size={15} style={styles.planName}>
                  {plan === 'yearly' ? t('tuition.plan.yearly') : t('tuition.plan.monthly')}
                </Sized>
                {plan === 'yearly' && props.saving !== null ? (
                  <View style={styles.tag}>
                    <Sized size={10} style={styles.tagText}>
                      {t('tuition.plan.save', { percent: props.saving })}
                    </Sized>
                  </View>
                ) : null}
              </View>
              <Sized size={19} style={styles.price}>
                {offer?.priceText ?? '—'}
                <Sized size={12.5} style={styles.per}>
                  {' '}
                  {plan === 'yearly' ? t('tuition.plan.perYear') : t('tuition.plan.perMonth')}
                </Sized>
              </Sized>
              <Sized size={11.5} style={styles.muted}>
                {offer === undefined
                  ? t('tuition.plan.loading')
                  : plan === 'monthly'
                    ? t('tuition.plan.monthNote')
                    : offer.perMonthText === null
                      ? ''
                      : t('tuition.plan.yearNote', { price: offer.perMonthText })}
              </Sized>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.foot}>
        <View style={styles.footCol}>
          <Label>{t('tuition.amount').toLocaleUpperCase(language)}</Label>
          <Sized size={22} style={[handText, styles.amount]} lines={1}>
            {chosen?.priceText ?? ' '}
          </Sized>
        </View>
        <View style={[styles.footCol, styles.footRight]}>
          <Label>{t('tuition.receivedBy').toLocaleUpperCase(language)}</Label>
          <ReceiptSignature label={t('tuition.signature')} />
        </View>
      </View>
      {props.stamp !== null ? (
        <StampIn restDeg={-14} style={styles.stampSpot} testID="tuition-stamp">
          <View
            accessible
            accessibilityLabel={props.stamp.word}
            style={[styles.stamp, { borderColor: props.stamp.color }]}
          >
            <View style={[styles.stampInner, { borderColor: props.stamp.color }]} />
            <Sized size={8.5} style={[styles.stampSmall, { color: props.stamp.color }]}>
              {t('brand.name').toLocaleUpperCase(language)}
            </Sized>
            <Sized
              size={props.stamp.big ? 30 : 19}
              style={[handText, styles.stampWord, { color: props.stamp.color }]}
              lines={2}
            >
              {props.stamp.word}
            </Sized>
            <Sized size={8.5} style={[styles.stampSmall, { color: props.stamp.color }]}>
              {props.stamp.sub}
            </Sized>
          </View>
        </StampIn>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: paper.sheet,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    boxShadow: '0 1px 2px rgba(60,40,20,0.06), 0 20px 44px rgba(60,40,20,0.11)',
  },
  head: { padding: 18, paddingBottom: 10, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: {
    flex: 1,
    color: paper.ink,
    borderBottomWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: 'rgba(28,26,24,0.22)',
  },
  muted: { color: paper.muted },
  dash: {
    marginHorizontal: 18,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: paper.rule,
  },
  lines: { paddingHorizontal: 18, paddingVertical: 6 },
  lineRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, minHeight: 27 },
  lineText: { fontWeight: '700', color: paper.ink, flexShrink: 1 },
  leader: {
    flex: 1,
    minWidth: 12,
    marginBottom: 5,
    borderBottomWidth: 2,
    borderStyle: 'dotted',
    borderColor: 'rgba(28,26,24,0.18)',
  },
  plans: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, paddingBottom: 4 },
  plan: {
    flexGrow: 1,
    flexBasis: 140,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 11,
    gap: 1,
  },
  planOn: {
    backgroundColor: paper.white,
    boxShadow: 'inset 0 0 0 2px #1C1A18, 0 6px 16px rgba(60,40,20,0.10)',
  },
  planOff: { backgroundColor: paper.faint },
  planDim: { opacity: 0.38 },
  planHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  planName: { fontWeight: '700', color: paper.ink },
  tag: { backgroundColor: paper.green, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { color: paper.white, fontWeight: '800' },
  price: { fontWeight: '800', color: paper.ink, fontVariant: ['tabular-nums'] },
  per: { fontWeight: '700', color: paper.muted },
  foot: { flexDirection: 'row', gap: 16, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 16 },
  footCol: { flex: 1, gap: 2 },
  footRight: { alignItems: 'flex-end' },
  amount: { color: paper.red },
  stampSpot: { position: 'absolute', right: 74, bottom: 4 },
  stamp: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
    padding: 10,
  },
  stampInner: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderRadius: 51,
    borderWidth: 1.5,
  },
  stampSmall: { fontWeight: '800', letterSpacing: 1.2 },
  stampWord: { textAlign: 'center', lineHeight: 30 },
});
