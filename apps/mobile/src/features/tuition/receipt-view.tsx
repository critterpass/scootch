import type { PhuMood } from '@phusclass/art/class';
import { localDateTime, type Instant } from '@phusclass/domain';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHandFont } from '../../classroom/use-hand-font';
import { useLanguage, useT, type Translate } from '../../i18n/i18n-provider';
import { GlassSurface } from '../../ui/glass-surface';
import { PhuFigure } from '../board/phu-figure';

import { ChargeCard } from './charge-card';
import { Mark } from './marks';
import type { PlanId } from './products';
import type { CustomerState, Offerings, PlanOffer } from './purchases-port';
import { freeStretchOf, receiptSteps, yearSaving, type ReceiptStage } from './receipt-model';
import { ReceiptPaper, type ReceiptStamp } from './receipt-paper';
import { Capsule, handText, paper, Sized, TextLink } from './receipt-parts';
import { receiptDay } from './tuition-dates';

export interface ReceiptViewProps {
  readonly stage: ReceiptStage;
  readonly plan: PlanId;
  readonly offerings: Offerings | null;
  readonly customer: CustomerState;
  readonly now: Instant;
  readonly timeZone: string;
  /** The full name from roll call, written on the receipt; `null` before roll call. */
  readonly name: string | null;
  /** False on a phone where nothing can be bought. */
  readonly available: boolean;
  /** A purchase or a restore is with the store. */
  readonly busy: boolean;
  /** His line, from the voice pack, when there is one to say (the win-back month). */
  readonly line: string | null;
  /** A plain word after an action that changed nothing, such as a restore that found nothing. */
  readonly message?: string | null;
  readonly onPick: (plan: PlanId) => void;
  readonly onPrimary: () => void;
  readonly onClose: () => void;
  readonly onRestore: () => void;
  readonly onManage: () => void;
  readonly onScholarship: () => void;
  readonly onLink: (page: 'terms' | 'privacy') => void;
}

const MOODS: Readonly<Record<ReceiptStage, PhuMood>> = {
  offer: 'peer',
  trial: 'approve',
  paid: 'approve',
  pending: 'watch',
  failed: 'think',
  scholarship: 'approve',
};

function primaryLabel(stage: ReceiptStage, chosen: PlanOffer | undefined, t: Translate): string {
  if (stage === 'failed') return t('tuition.cta.retry');
  if (stage !== 'offer') return t('tuition.cta.back');
  if (chosen?.winBack) return t('tuition.cta.freeMonth');
  return freeStretchOf(chosen) !== null ? t('tuition.cta.freeWeek') : t('tuition.cta.pay');
}

function fineText(
  stage: ReceiptStage,
  plan: PlanId,
  chosen: PlanOffer | undefined,
  chargeDay: string,
  t: Translate,
): string {
  const price = chosen?.priceText;
  switch (stage) {
    case 'offer':
      if (price === undefined) return '';
      if (freeStretchOf(chosen) !== null) {
        return plan === 'yearly'
          ? t('tuition.fine.freeYear', { price, date: chargeDay })
          : t('tuition.fine.freeMonth', { price, date: chargeDay });
      }
      return plan === 'yearly'
        ? t('tuition.fine.payYear', { price })
        : t('tuition.fine.payMonth', { price });
    case 'trial':
      return t('tuition.fine.trial', { date: chargeDay });
    case 'pending':
      return t('tuition.fine.pending');
    case 'failed':
      return t('tuition.fine.failed');
    case 'paid':
      return t('tuition.fine.paid');
    case 'scholarship':
      return t('tuition.fine.scholarship');
  }
}

/**
 * The tuition page (`Tuition` board), drawn from props so the registry can show every stage: the
 * receipt, the card of dates before the button, the one action, and under it the scholarship,
 * the terms, privacy and Apple's subscription terms. Never shown unasked: it opens from the
 * notice at recess or a quiet lock.
 */
export function ReceiptView(props: ReceiptViewProps) {
  const t = useT();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const hand = useHandFont();
  const { stage, offerings, customer, now, timeZone } = props;
  const today = localDateTime(now, timeZone).date;
  const steps = receiptSteps({ stage, plan: props.plan, offerings, customer, now, timeZone });
  const chosen = offerings?.plans[props.plan];
  const last = steps.at(-1);
  const chargeDay =
    last !== undefined && 'day' in last ? receiptDay(last.day, today, language) : '';
  const fine = props.message ?? fineText(stage, props.plan, chosen, chargeDay, t);
  const stamp: ReceiptStamp | null =
    stage === 'paid'
      ? {
          word: t('tuition.stamp.paid'),
          sub: receiptDay(today, '', language),
          color: paper.red,
          big: true,
        }
      : stage === 'trial' || stage === 'scholarship'
        ? {
            word: stage === 'trial' ? t('tuition.stamp.free') : t('tuition.stamp.scholarship'),
            sub: chargeDay === '' ? '' : t('tuition.stamp.until', { date: chargeDay }),
            color: paper.blue,
            big: false,
          }
        : null;

  return (
    <View style={[styles.page, { paddingTop: insets.top }]} testID="tuition">
      <View style={styles.bar}>
        <GlassSurface interactive style={styles.close}>
          <Pressable
            testID="tuition-close"
            accessibilityRole="button"
            accessibilityLabel={t('tuition.close')}
            onPress={props.onClose}
            style={styles.closePress}
          >
            <Mark name="close" color={paper.ink} size={14} weight={2.6} />
          </Pressable>
        </GlassSurface>
        {stage === 'offer' || stage === 'failed' || stage === 'paid' || stage === 'trial' ? (
          <Pressable
            testID={stage === 'paid' || stage === 'trial' ? 'tuition-manage' : 'tuition-restore'}
            accessibilityRole="button"
            onPress={stage === 'paid' || stage === 'trial' ? props.onManage : props.onRestore}
            disabled={props.busy || !props.available}
            hitSlop={8}
          >
            <Sized size={15} style={styles.corner}>
              {stage === 'paid' || stage === 'trial' ? t('tuition.manage') : t('tuition.restore')}
            </Sized>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Sized size={34} role="header" style={styles.title}>
              {t('tuition.title')}
            </Sized>
            <Sized size={14} style={styles.subtitle}>
              {t('tuition.subtitle')}
            </Sized>
            {props.line !== null ? (
              <Sized size={19} style={[handText, styles.line]}>
                {props.line}
              </Sized>
            ) : null}
          </View>
          <View style={styles.phu} accessibilityElementsHidden>
            <PhuFigure mood={MOODS[stage]} width={104} hand={hand} />
          </View>
        </View>
        <ReceiptPaper
          stage={stage}
          plan={props.plan}
          offerings={offerings}
          name={props.name}
          saving={yearSaving(offerings)}
          stamp={stamp}
          onPick={props.onPick}
        />
        <ChargeCard stage={stage} steps={steps} today={today} />
        <View style={styles.actions}>
          {props.available || stage !== 'offer' ? (
            <Capsule
              testID="tuition-primary"
              label={primaryLabel(stage, chosen, t)}
              tone={stage === 'offer' || stage === 'failed' ? 'ink' : 'green'}
              disabled={props.busy || (stage === 'offer' && chosen === undefined)}
              onPress={props.onPrimary}
            />
          ) : (
            <Sized size={14} style={styles.fine}>
              {t('tuition.unavailable')}
            </Sized>
          )}
          {fine !== '' ? (
            <Sized size={12} style={styles.fine}>
              {fine}
            </Sized>
          ) : null}
        </View>
        <View style={styles.links}>
          <TextLink
            testID="tuition-cant-pay"
            label={t('tuition.cantPay')}
            strong
            onPress={props.onScholarship}
          />
          <Sized size={12.5} style={styles.dot}>
            ·
          </Sized>
          <TextLink
            testID="tuition-terms"
            label={t('tuition.terms')}
            onPress={() => props.onLink('terms')}
          />
          <Sized size={12.5} style={styles.dot}>
            ·
          </Sized>
          <TextLink
            testID="tuition-privacy"
            label={t('tuition.privacy')}
            onPress={() => props.onLink('privacy')}
          />
        </View>
        <Sized size={11} style={styles.disclosure}>
          {t('tuition.disclosure')}
        </Sized>
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
  close: { width: 40, height: 40, borderRadius: 20 },
  closePress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  corner: { color: '#6B655E', fontWeight: '500' },
  scroll: { paddingHorizontal: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 4 },
  headerText: { flex: 1, gap: 4 },
  title: { fontWeight: '800', letterSpacing: -0.8, color: paper.ink },
  subtitle: { color: paper.body, lineHeight: 20 },
  line: { color: paper.redDeep, marginTop: 4 },
  phu: { width: 104, height: 116, overflow: 'hidden' },
  actions: { gap: 8, alignItems: 'center', marginTop: 4 },
  fine: { color: paper.muted, textAlign: 'center', lineHeight: 17 },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  dot: { color: paper.muted },
  disclosure: { color: paper.muted, textAlign: 'center', lineHeight: 15, marginTop: 4 },
});
