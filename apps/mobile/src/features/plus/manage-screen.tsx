import { View } from 'react-native';

import { FREE_STARTS_PER_DAY } from '@scootch/domain';
import { spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { KeepFrame } from '../reveal/ui/keep-frame';
import { SessionText } from '../session/ui/session-text';

import type { PlanId } from './products';
import type { CustomerState } from './purchases-port';
import { ChoiceRow, Panel } from './ui/parts';

export interface ManageModel {
  readonly customer: CustomerState;
  /** The store's price text for the active plan; `null` when it is not known. */
  readonly price: string | null;
  /** The store's next date for the plan (trial end, renewal or end), already written out. */
  readonly date: string | null;
  /** The trial ends today: "Change plan" leads to the three choices. */
  readonly lastTrialDay: boolean;
  readonly notice: 'restore_none' | 'restore_done' | 'restore_failed' | 'unavailable' | null;
}

export interface ManageActions {
  readonly close: () => void;
  readonly seePlus: () => void;
  readonly changePlan: () => void;
  readonly restore: () => void;
  readonly cancel: () => void;
  readonly openShelf: () => void;
}

const NOTICES = {
  restore_none: 'plus.restore.none',
  restore_done: 'plus.restore.done',
  restore_failed: 'plus.restore.failed',
  unavailable: 'plus.unavailable',
} as const;

function planLine(model: ManageModel, t: ReturnType<typeof useT>): string {
  const { customer, date } = model;
  const plan: PlanId | null = customer.activePlan;
  if (plan === 'lifetime') return t('plus.manage.lifetime');
  if (plan === null) return t('plus.manage.free.note', { count: FREE_STARTS_PER_DAY });
  if (date === null) return '';
  if (customer.inTrial && customer.willRenew) return t('plus.manage.trialEnds', { date });
  if (!customer.willRenew) return t('plus.manage.ends', { date });
  return t(`plus.manage.renews.${plan}`, { date });
}

/**
 * The manage page: the plan, its next date and the reminder that comes before it, and the ways to
 * change, restore and cancel. Changing and cancelling are Apple's own sheet.
 */
export function ManageScreen({ model, actions }: { model: ManageModel; actions: ManageActions }) {
  const t = useT();
  const { palette } = useScreenStyle();
  const plan = model.customer.activePlan;
  const subscribed = plan === 'monthly' || plan === 'yearly';
  const title =
    plan === null
      ? t('plus.manage.free')
      : [t(`plus.plan.${plan}`), model.price].filter((part) => part !== null).join(' · ');
  return (
    <KeepFrame
      testID="plus-manage"
      title={t('brand.plus')}
      close={{ label: t('keep.close'), hint: t('plus.done.hint'), onPress: actions.close }}
      closeTestID="plus-manage-close"
    >
      <Panel testID="plus-manage-plan">
        <SessionText face="action" color={palette.ink}>
          {title}
        </SessionText>
        <SessionText face="body" color={palette.muted} testID="plus-manage-plan-line">
          {planLine(model, t)}
        </SessionText>
      </Panel>
      <View style={{ gap: spacing.sm }}>
        {plan === null ? (
          <ChoiceRow
            title={t('plus.manage.see')}
            hint={t('plus.manage.see.hint')}
            testID="plus-manage-see"
            onPress={actions.seePlus}
          />
        ) : null}
        {subscribed ? (
          <ChoiceRow
            title={t('plus.manage.change')}
            note={model.lastTrialDay ? t('plus.manage.lastDay') : null}
            hint={t('plus.opensApple.hint')}
            testID="plus-manage-change"
            onPress={actions.changePlan}
          />
        ) : null}
        <ChoiceRow
          title={t('plus.manage.restore')}
          hint={t('plus.restore.hint')}
          testID="plus-manage-restore"
          onPress={actions.restore}
        />
        <ChoiceRow
          title={t('plus.manage.shelf')}
          hint={t('plus.manage.shelf.hint')}
          testID="plus-manage-shelf"
          onPress={actions.openShelf}
        />
        {subscribed && model.customer.willRenew ? (
          <ChoiceRow
            title={t('plus.manage.cancel')}
            hint={t('plus.opensApple.hint')}
            aside={t('plus.manage.opensApple')}
            ending
            testID="plus-manage-cancel"
            onPress={actions.cancel}
          />
        ) : null}
      </View>
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
      <SessionText face="caption" color={palette.muted}>
        {t('plus.manage.keeps', { count: FREE_STARTS_PER_DAY })}
      </SessionText>
    </KeepFrame>
  );
}
