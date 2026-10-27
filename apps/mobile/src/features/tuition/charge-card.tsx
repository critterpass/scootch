import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, withTiming } from 'react-native-reanimated';

import { useLanguage, useT, type Translate } from '../../i18n/i18n-provider';
import { CROSSFADE_MS, SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { useMayMove } from '../../ui/motion/use-feel';

import type { ReceiptStage, ReceiptStep } from './receipt-model';
import { Label, paper, Sized } from './receipt-parts';
import { receiptDay } from './tuition-dates';

const STEP_TONES: Readonly<Record<ReceiptStep['kind'], { dot: string; label: string }>> = {
  opensFree: { dot: paper.green, label: paper.green },
  opensPaid: { dot: paper.green, label: paper.green },
  scholarship: { dot: paper.green, label: paper.green },
  note: { dot: paper.amberDot, label: paper.amber },
  firstCharge: { dot: paper.red, label: paper.red },
  renews: { dot: paper.grey, label: paper.muted },
  ends: { dot: paper.grey, label: paper.muted },
  scholarshipEnds: { dot: paper.grey, label: paper.muted },
  waiting: { dot: paper.amberDot, label: paper.amber },
  notPaid: { dot: paper.red, label: paper.red },
};

const BACKGROUND: Readonly<Record<ReceiptStage, string>> = {
  offer: paper.white,
  trial: paper.white,
  paid: paper.greenSoft,
  scholarship: paper.greenSoft,
  pending: paper.amberSoft,
  failed: paper.redSoft,
};

function stepText(step: ReceiptStep, t: Translate): string {
  switch (step.kind) {
    case 'opensFree':
      return t('tuition.step.opensFree');
    case 'opensPaid':
      return t('tuition.step.opensPaid');
    case 'note':
      return t('tuition.step.note');
    case 'firstCharge':
      return t('tuition.step.firstCharge', { price: step.price });
    case 'renews':
      return t('tuition.step.renews', { price: step.price });
    case 'ends':
      return t('tuition.step.ends');
    case 'scholarship':
      return t('tuition.step.scholarship');
    case 'scholarshipEnds':
      return t('tuition.step.scholarshipEnds');
    case 'waiting':
      return t('tuition.step.waiting');
    case 'notPaid':
      return t('tuition.step.notPaid');
  }
}

function stepWhen(step: ReceiptStep, today: string, t: Translate, language: 'en' | 'vi'): string {
  if (step.kind === 'waiting') return t('tuition.step.waitingLabel');
  if (step.kind === 'notPaid') return t('tuition.step.notPaidLabel');
  return step.day === today ? t('tuition.step.today') : receiptDay(step.day, today, language);
}

/** The Tuition board's `.swap`: up 6 points and in, over 420 ms on the interface curve. */
function swapIn() {
  'worklet';
  const timing = { duration: 420, easing: SPRING_CURVE };
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 6 }] },
    animations: {
      opacity: withTiming(1, timing),
      transform: [{ translateY: withTiming(0, timing) }],
    },
  };
}

/**
 * The card under the receipt, before the button and after it: today, the day of his note and the
 * day of the charge, every date from the store; waiting on Ask to Buy; or not paid.
 */
export function ChargeCard({
  stage,
  steps,
  today,
}: {
  readonly stage: ReceiptStage;
  readonly steps: readonly ReceiptStep[];
  readonly today: string;
}) {
  const t = useT();
  const { language } = useLanguage();
  const mayMove = useMayMove();
  // The page arrives on the system's sheet: the card swaps in only for a stage after the first.
  const firstStage = useRef(stage).current;
  if (steps.length === 0) return null;
  const entering =
    stage === firstStage ? undefined : mayMove ? swapIn : FadeIn.duration(CROSSFADE_MS);
  return (
    <Animated.View
      key={stage}
      {...(entering === undefined ? {} : { entering })}
      style={[styles.card, { backgroundColor: BACKGROUND[stage] }]}
    >
      {steps.map((step) => {
        const tone = STEP_TONES[step.kind];
        return (
          <View key={step.kind} style={styles.step} testID={`tuition-step-${step.kind}`}>
            <View style={styles.head}>
              <View style={[styles.dot, { backgroundColor: tone.dot }]} />
              <Label color={tone.label} kind="small">
                {stepWhen(step, today, t, language)}
              </Label>
            </View>
            <Sized size={12.5} style={styles.text}>
              {stepText(step, t)}
            </Sized>
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  step: { flexGrow: 1, flexBasis: 90, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontWeight: '600', color: paper.ink, lineHeight: 17 },
});
