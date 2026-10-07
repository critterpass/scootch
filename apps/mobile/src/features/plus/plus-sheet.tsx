import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Attitude } from '@scootch/domain';
import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { PressSpring } from '../../ui/motion/press-spring';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';
import { SessionText } from '../session/ui/session-text';

import type { PlanId } from './products';
import { offerOf, type SheetState } from './sheet-controller';
import { actionLabel, smallPrint } from './sheet-model';
import { Aurora, NIGHT } from './ui/aurora';
import { MemberCard } from './ui/member-card';
import { DIM, ON_NIGHT, PlanTiles } from './ui/plan-tiles';
import { Sweep } from './ui/sweep';

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
  /** `null` on a day with something heavy in it: nothing is said. */
  readonly said: string | null;
  /** The year the member card would be issued in, as the card writes it. */
  readonly year: string;
  readonly state: SheetState;
  readonly actions: PlusSheetActions;
}

const NOTICES = {
  failed: 'plus.failed',
  restore_none: 'plus.restore.none',
  restore_failed: 'plus.restore.failed',
} as const;

// The sheet is a dark page in both appearances, so its inks are its own.
const SILVER = '#D9D4CC';
const ACTION = '#FBF8F3';
const ACTION_INK = '#1C1A17';
/** The board's member card on the sheet is 310 points wide. */
const CARD_WIDTH = 310;

/**
 * The one sheet anything is sold on, dressed up: a holo member card that turns with the phone
 * over a slow glow, Scootch's one line, the three plans with a foil edge on the chosen one, one
 * action, "Not now" in plain sight, the small print, and Terms, Privacy and Restore. Every price
 * on it is the store's own text; while there is none, there is no action to press.
 */
export function PlusSheet({ attitude, said, year, state, actions }: PlusSheetProps) {
  const t = useT();
  const { largeText, captured, allowFontScaling, size } = useScreenStyle();
  const offer = offerOf(state);
  const link = (label: string, hint: string, testID: string, onPress: () => void) => (
    <PressSpring
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      testID={testID}
      hitSlop={spacing.sm}
      style={styles.link}
    >
      <SessionText face="caption" color={ON_NIGHT} style={styles.underlined}>
        {label}
      </SessionText>
    </PressSpring>
  );
  return (
    <SafeFrame testID="plus-sheet" style={styles.page}>
      <Aurora />
      <View style={styles.bar}>
        <Text
          allowFontScaling={allowFontScaling}
          maxFontSizeMultiplier={1.4}
          accessibilityRole="header"
          style={[styles.mark, { fontSize: size(20) }]}
        >
          {t('brand.name')} <Text style={styles.silver}>{t('brand.plus')}</Text>
        </Text>
        <PressSpring
          accessibilityRole="button"
          accessibilityLabel={t('session.notNow')}
          accessibilityHint={t('plus.close.hint')}
          onPress={actions.close}
          testID="plus-sheet-close"
          style={styles.close}
        >
          <View style={styles.cross}>
            <View style={[styles.stroke, styles.down]} />
            <View style={[styles.stroke, styles.up]} />
          </View>
        </PressSpring>
      </View>
      <ScrollView contentContainerStyle={styles.middle} showsVerticalScrollIndicator={false}>
        <View style={styles.stage}>
          <MemberCard
            finish="holo"
            width={largeText ? 240 : CARD_WIDTH}
            number={null}
            year={year}
            line={t('plus.card.yourName')}
            mood="bargaining"
            attitude={attitude}
            testID="plus-sheet-card"
          />
        </View>
        {said === null ? null : (
          <Text
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={1.6}
            style={[styles.said, { fontSize: size(25), lineHeight: size(25) * 1.14 }]}
            testID="plus-sheet-line"
          >
            {said}
          </Text>
        )}

        {state.phase === 'loading' ? (
          <View style={styles.wait} testID="plus-sheet-loading">
            <ActivityIndicator color={ON_NIGHT} animating={!captured} />
            <SessionText face="body" color={DIM}>
              {t('plus.loading')}
            </SessionText>
          </View>
        ) : null}
        {state.phase === 'unavailable' ? (
          <SessionText face="body" color={DIM} testID="plus-sheet-unavailable">
            {t('plus.unavailable')}
          </SessionText>
        ) : null}

        {state.phase === 'ready' && state.offerings ? (
          <PlanTiles
            offerings={state.offerings}
            chosen={state.plan}
            busy={state.busy}
            onChoose={actions.choose}
          />
        ) : null}
        {state.notice ? (
          <SessionText
            face="body"
            color={ON_NIGHT}
            accessibilityLiveRegion="polite"
            testID={`plus-sheet-notice-${state.notice}`}
          >
            {t(NOTICES[state.notice])}
          </SessionText>
        ) : null}
      </ScrollView>
      <View style={styles.foot}>
        {offer && state.phase === 'ready' ? (
          <PressSpring
            accessibilityRole="button"
            accessibilityLabel={state.busy ? t('plus.purchasing') : actionLabel(offer, t)}
            accessibilityHint={t('plus.action.hint')}
            accessibilityState={{ disabled: state.busy }}
            disabled={state.busy}
            onPress={actions.buy}
            feedback="primary"
            restOpacity={state.busy ? 0.6 : 1}
            testID="plus-sheet-action"
            style={styles.action}
          >
            {state.busy ? null : (
              <Sweep colors={['rgba(255,180,150,0.55)', 'rgba(160,220,255,0.45)']} />
            )}
            <Text
              allowFontScaling={allowFontScaling}
              maxFontSizeMultiplier={1.5}
              style={[styles.actionLabel, { fontSize: size(17) }]}
            >
              {state.busy ? t('plus.purchasing') : actionLabel(offer, t)}
            </Text>
          </PressSpring>
        ) : null}
        <PressSpring
          accessibilityRole="button"
          accessibilityLabel={t('session.notNow')}
          accessibilityHint={t('plus.notNow.hint')}
          onPress={actions.close}
          feedback="choice"
          testID="plus-sheet-not-now"
          style={styles.notNow}
        >
          <Text
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={1.5}
            style={[styles.notNowLabel, { fontSize: size(16) }]}
          >
            {t('session.notNow')}
          </Text>
        </PressSpring>
        {offer && state.phase === 'ready' ? (
          <SessionText face="caption" color={DIM} style={styles.centred} testID="plus-sheet-print">
            {smallPrint(offer, t)}
          </SessionText>
        ) : null}
        <View style={[styles.links, largeText ? styles.stacked : null]}>
          {link(t('plus.terms'), t('plus.terms.hint'), 'plus-sheet-terms', actions.openTerms)}
          {link(
            t('plus.privacy'),
            t('plus.privacy.hint'),
            'plus-sheet-privacy',
            actions.openPrivacy,
          )}
          {link(t('plus.restore'), t('plus.restore.hint'), 'plus-sheet-restore', actions.restore)}
        </View>
      </View>
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: NIGHT },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  mark: { color: ON_NIGHT, fontFamily: fonts.heading, fontWeight: '800', letterSpacing: -0.4 },
  silver: { color: SILVER },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  stroke: {
    position: 'absolute',
    width: 2.2,
    height: 16,
    borderRadius: 1,
    backgroundColor: ON_NIGHT,
  },
  down: { transform: [{ rotate: '45deg' }] },
  up: { transform: [{ rotate: '-45deg' }] },
  middle: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: spacing.md, gap: spacing.lg },
  stage: { minHeight: 250, alignItems: 'center', justifyContent: 'center' },
  said: {
    color: ON_NIGHT,
    fontFamily: fonts.heading,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  wait: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  foot: { paddingHorizontal: 20, paddingBottom: spacing.md, gap: spacing.sm },
  action: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: ACTION,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    boxShadow: '0 12px 30px -8px rgba(240,86,46,0.6)',
  },
  actionLabel: {
    color: ACTION_INK,
    fontFamily: fonts.body,
    fontWeight: '600',
    letterSpacing: -0.17,
    textAlign: 'center',
  },
  notNow: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notNowLabel: { color: ON_NIGHT, fontFamily: fonts.body, fontWeight: '600' },
  centred: { textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  link: { minHeight: 44, justifyContent: 'center' },
  underlined: { textDecorationLine: 'underline' },
});
