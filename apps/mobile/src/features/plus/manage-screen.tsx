import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { FREE_STARTS_PER_DAY } from '@scootch/domain';
import { fonts, shadows, spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { useCharacterMotion } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';
import { KeepFrame } from '../reveal/ui/keep-frame';
import { SessionText } from '../session/ui/session-text';
import { CardThumb } from '../settings/look-thumbs';
import { Row, Section } from '../settings/rows';
import { inkOf } from '../studio/catalogue';
import type { Look } from '../studio/look';

import type { Member } from './member';
import { planLine } from './plan-line';
import type { CustomerState } from './purchases-port';
import { MemberCard } from './ui/member-card';

export interface ManageModel {
  readonly customer: CustomerState;
  /** The store's price text for the active plan; `null` when it is not known. */
  readonly price: string | null;
  /** The store's next date for the plan (trial end, renewal or end), already written out. */
  readonly date: string | null;
  /** The trial ends today: "Manage subscription" leads to the three choices. */
  readonly lastTrialDay: boolean;
  readonly notice: 'restore_none' | 'restore_done' | 'restore_failed' | 'unavailable' | null;
  /** What the card wears. */
  readonly look: Look;
  readonly member: Member;
  /** The year and the short month Plus began, as the person reads them; `null` when not known. */
  readonly since: { readonly month: string; readonly year: string } | null;
  /** The year printed on the card when it has no joining date yet. */
  readonly thisYear: string;
  /** The name on the card: the account's, when there is one. */
  readonly name: string | null;
  readonly caught: number;
  readonly finishesOwned: number;
  /** False on a day with something heavy in it: nothing that sells is offered. */
  readonly selling: boolean;
}

export interface ManageActions {
  readonly close: () => void;
  readonly seePlus: () => void;
  /** Opens Apple's own sheet, where a plan is changed or cancelled. */
  readonly manage: () => void;
  readonly restore: () => void;
}

const NOTICES = {
  restore_none: 'plus.restore.none',
  restore_done: 'plus.restore.done',
  restore_failed: 'plus.restore.failed',
  unavailable: 'plus.unavailable',
} as const;

/** The board's card on this page is 345 points wide on a 393 point phone. */
const CARD_WIDTH = 345;

/** What the date beside the plan is: the trial's end, the day it stops, or the next renewal. */
function dateLabel(
  customer: CustomerState,
): 'plus.card.freeUntil' | 'plus.card.ends' | 'plus.card.renews' {
  if (customer.inTrial && customer.willRenew) return 'plus.card.freeUntil';
  return customer.willRenew ? 'plus.card.renews' : 'plus.card.ends';
}

function Figure({ value, label }: { readonly value: string; readonly label: string }) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <View accessible style={[styles.figure, { backgroundColor: palette.surface }]}>
      <Text
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={1.4}
        style={[styles.value, { color: palette.ink, fontSize: size(24) }]}
      >
        {value}
      </Text>
      <SessionText face="caption" color={palette.muted}>
        {label}
      </SessionText>
    </View>
  );
}

/**
 * Your card: the member card in the finish and ink the person wears, three figures, then the
 * plan, its next date and the way to manage it, right under the card and never hidden. Changing
 * and cancelling are Apple's own sheet. Someone without Plus sees Scootch beside what free
 * Scootch is, the card Plus comes with, and the way to see Plus. The studio is not here: it has
 * its own row in Settings.
 */
export function ManageScreen({ model, actions }: { model: ManageModel; actions: ManageActions }) {
  const t = useT();
  const { palette, largeText, allowFontScaling, size } = useScreenStyle();
  const character = useCharacterMotion();
  const { width } = useWindowDimensions();
  const { customer, look, member } = model;
  const plan = customer.activePlan;
  const subscribed = plan === 'monthly' || plan === 'yearly';
  const ink = inkOf(look.ink);
  const wearing = `${t(`finish.${look.finish}`)} · ${ink.code}`;
  return (
    <KeepFrame
      testID="plus-manage"
      title={plan === null ? t('brand.plus') : t('plus.card.title')}
      close={{ label: t('keep.close'), hint: t('plus.done.hint'), onPress: actions.close }}
      closeTestID="plus-manage-close"
    >
      {plan === null ? (
        <>
          <View
            style={[styles.free, { backgroundColor: palette.surface }]}
            testID="plus-manage-plan"
          >
            <Scootch mood="pleased" size={76} {...character} />
            <View style={styles.freeWords}>
              <Text
                allowFontScaling={allowFontScaling}
                maxFontSizeMultiplier={1.4}
                style={[styles.freeTitle, { color: palette.ink, fontSize: size(20) }]}
              >
                {t('plus.manage.free')}
              </Text>
              <SessionText face="caption" color={palette.muted} testID="plus-manage-plan-line">
                {planLine(customer, model.date, t)}
              </SessionText>
            </View>
          </View>
          {model.selling && !largeText ? (
            // The card Plus comes with, as a picture: the way to it is the row under it.
            <View style={styles.preview}>
              <MemberCard
                finish="holo"
                width={Math.min(CARD_WIDTH, width - spacing.lg * 2) * 0.86}
                number={null}
                year={model.thisYear}
                line={t('plus.card.yourName')}
                mood="bargaining"
                testID="plus-manage-preview"
              />
            </View>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.stage}>
            <MemberCard
              finish={look.finish}
              width={largeText ? 260 : CARD_WIDTH}
              number={member.number}
              year={model.since?.year ?? model.thisYear}
              line={model.name ?? wearing}
              mood="pleased"
              testID="plus-manage-card"
            />
          </View>
          <View style={[styles.figures, largeText ? styles.stacked : null]}>
            <Figure
              value={String(model.caught)}
              label={t('plus.card.caught', { count: model.caught })}
            />
            <Figure
              value={String(model.finishesOwned)}
              label={t('plus.card.finishes', { count: model.finishesOwned })}
            />
            {model.since ? (
              <Figure
                value={model.since.month}
                label={t('plus.card.since', { year: model.since.year })}
              />
            ) : null}
          </View>
        </>
      )}

      <Section>
        {plan === null ? (
          <Row
            first
            leading={<CardThumb finish="holo" number={null} />}
            label={t('plus.manage.see')}
            hint={t('plus.manage.see.hint')}
            {...(model.selling ? { onPress: actions.seePlus } : { inert: true })}
            testID="plus-manage-see"
          />
        ) : (
          <>
            <Row
              first
              kind="fact"
              label={t('plus.card.plan')}
              value={[t(`plus.plan.${plan}`), model.price]
                .filter((part) => part !== null)
                .join(' · ')}
              testID="plus-manage-plan"
            />
            {subscribed && model.date !== null ? (
              <Row
                kind="fact"
                label={t(dateLabel(customer))}
                value={model.date}
                testID="plus-manage-date"
              />
            ) : null}
            {subscribed ? (
              <Row
                label={t('plus.card.manage')}
                {...(model.lastTrialDay ? { sub: t('plus.manage.lastDay') } : {})}
                hint={t('plus.opensApple.hint')}
                onPress={actions.manage}
                testID="plus-manage-change"
              />
            ) : null}
          </>
        )}
        <Row
          label={t('plus.manage.restore')}
          hint={t('plus.restore.hint')}
          onPress={actions.restore}
          testID="plus-manage-restore"
        />
      </Section>
      {model.notice ? (
        <SessionText
          face="body"
          color={palette.ink}
          accessibilityLiveRegion="polite"
          testID={`plus-manage-notice-${model.notice}`}
        >
          {t(NOTICES[model.notice])}
        </SessionText>
      ) : null}
      {plan === null ? null : (
        <SessionText face="caption" color={palette.muted} testID="plus-manage-plan-line">
          {planLine(customer, model.date, t)}
        </SessionText>
      )}
      <SessionText face="caption" color={palette.muted}>
        {t('plus.manage.keeps', { count: FREE_STARTS_PER_DAY })}
      </SessionText>
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', paddingVertical: spacing.md },
  // What free Scootch is: Scootch himself beside the words, as the board's plan card has him.
  free: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 26,
    paddingVertical: spacing.md,
    paddingLeft: spacing.sm + 4,
    paddingRight: spacing.md + 4,
    boxShadow: shadows.card,
  },
  freeWords: { flex: 1, gap: 4 },
  freeTitle: { fontFamily: fonts.heading, fontWeight: '800', letterSpacing: -0.4 },
  preview: { alignItems: 'center', paddingVertical: spacing.sm, transform: [{ rotate: '-2deg' }] },
  figures: { flexDirection: 'row', gap: spacing.sm },
  stacked: { flexDirection: 'column' },
  figure: { flex: 1, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 12, gap: 4 },
  value: { fontFamily: fonts.heading, fontWeight: '800' },
});
