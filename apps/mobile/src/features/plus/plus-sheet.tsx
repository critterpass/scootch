import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { Attitude } from '@scootch/domain';
import { radius, spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { KeepFrame } from '../reveal/ui/keep-frame';
import { SessionText } from '../session/ui/session-text';

import { PLANS, type PlanId } from './products';
import { offerOf, type SheetState } from './sheet-controller';
import { actionLabel, planNote, smallPrint } from './sheet-model';
import { PlusMark } from './ui/parts';

export interface PlusSheetActions {
  readonly close: () => void;
  readonly choose: (plan: PlanId) => void;
  readonly buy: () => void;
  readonly restore: () => void;
  readonly openTerms: () => void;
  readonly openPrivacy: () => void;
}

export interface PlusSheetProps {
  readonly attitude: Attitude;
  /** Scootch's one line, from the line pack in the person's attitude. */
  readonly said: string;
  readonly state: SheetState;
  readonly actions: PlusSheetActions;
}

const NOTICES = {
  failed: 'plus.failed',
  restore_none: 'plus.restore.none',
  restore_failed: 'plus.restore.failed',
} as const;

/**
 * The one sheet anything is sold on: Scootch and one line, the three plans, one action, "Not now"
 * in plain sight, the small print, and Terms, Privacy and Restore. Every price on it is the
 * store's own text; while there is none, there is no action to press.
 */
export function PlusSheet({ attitude, said, state, actions }: PlusSheetProps) {
  const t = useT();
  const { palette, largeText, captured } = useScreenStyle();
  const offer = offerOf(state);
  const link = (label: string, hint: string, testID: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      testID={testID}
      hitSlop={spacing.sm}
      style={styles.link}
    >
      <SessionText face="caption" color={palette.ink} style={styles.underlined}>
        {label}
      </SessionText>
    </Pressable>
  );
  return (
    <KeepFrame
      testID="plus-sheet"
      close={{ label: t('session.notNow'), hint: t('plus.close.hint'), onPress: actions.close }}
      closeTestID="plus-sheet-close"
    >
      <PlusMark name={t('brand.name')} plus={t('brand.plus')} />
      <View style={styles.centre}>
        <Scootch
          mood="waiting"
          attitude={attitude}
          size={largeText ? 96 : 150}
          {...(captured ? { reducedMotion: true } : {})}
        />
      </View>
      <SessionText face="headline" color={palette.ink} style={styles.said} testID="plus-sheet-line">
        {said}
      </SessionText>

      {state.phase === 'loading' ? (
        <View style={styles.wait} testID="plus-sheet-loading">
          <ActivityIndicator color={palette.ink} animating={!captured} />
          <SessionText face="body" color={palette.muted}>
            {t('plus.loading')}
          </SessionText>
        </View>
      ) : null}
      {state.phase === 'unavailable' ? (
        <SessionText face="body" color={palette.muted} testID="plus-sheet-unavailable">
          {t('plus.unavailable')}
        </SessionText>
      ) : null}

      {state.phase === 'ready' && state.offerings ? (
        <View
          accessibilityRole="radiogroup"
          style={[styles.plans, largeText ? styles.stacked : null]}
        >
          {PLANS.map((plan) => {
            const one = state.offerings?.plans[plan];
            if (!one) return null;
            const chosen = plan === state.plan;
            return (
              <Pressable
                key={plan}
                accessibilityRole="radio"
                accessibilityState={{ selected: chosen, checked: chosen, disabled: state.busy }}
                accessibilityLabel={`${t(`plus.plan.${plan}`)}, ${one.priceText}, ${planNote(one, t)}`}
                accessibilityHint={t('plus.plan.hint')}
                disabled={state.busy}
                onPress={() => actions.choose(plan)}
                testID={`plus-plan-${plan}`}
                style={[
                  styles.plan,
                  largeText ? null : styles.grow,
                  {
                    backgroundColor: chosen ? palette.surface : `${palette.ink}0F`,
                    borderColor: chosen ? palette.tomato : 'transparent',
                  },
                ]}
              >
                <SessionText face="caption" color={chosen ? palette.tomato : palette.muted}>
                  {t(`plus.plan.${plan}`)}
                </SessionText>
                <SessionText face="action" color={palette.ink} testID={`plus-price-${plan}`}>
                  {one.priceText}
                </SessionText>
                <SessionText face="caption" color={palette.muted}>
                  {planNote(one, t)}
                </SessionText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {offer && state.phase === 'ready' ? (
        <CapsuleButton
          label={state.busy ? t('plus.purchasing') : actionLabel(offer, t)}
          hint={t('plus.action.hint')}
          disabled={state.busy}
          onPress={actions.buy}
          testID="plus-sheet-action"
        />
      ) : null}
      <CapsuleButton
        label={t('session.notNow')}
        hint={t('plus.notNow.hint')}
        tone="quiet"
        onPress={actions.close}
        testID="plus-sheet-not-now"
      />
      {state.notice ? (
        <SessionText
          face="body"
          color={palette.ink}
          accessibilityLiveRegion="polite"
          testID={`plus-sheet-notice-${state.notice}`}
        >
          {t(NOTICES[state.notice])}
        </SessionText>
      ) : null}
      {offer && state.phase === 'ready' ? (
        <SessionText face="caption" color={palette.muted} testID="plus-sheet-print">
          {smallPrint(offer, t)}
        </SessionText>
      ) : null}
      <View style={[styles.links, largeText ? styles.stacked : null]}>
        {link(t('plus.terms'), t('plus.terms.hint'), 'plus-sheet-terms', actions.openTerms)}
        {link(t('plus.privacy'), t('plus.privacy.hint'), 'plus-sheet-privacy', actions.openPrivacy)}
        {link(t('plus.restore'), t('plus.restore.hint'), 'plus-sheet-restore', actions.restore)}
      </View>
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center' },
  said: { textAlign: 'center' },
  wait: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  plans: { flexDirection: 'row', gap: spacing.sm },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  grow: { flex: 1 },
  plan: {
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  links: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  link: { minHeight: 44, justifyContent: 'center' },
  underlined: { textDecorationLine: 'underline' },
});
