import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { MonsterRow, SettingsRow } from '@scootch/domain';
import { fonts, radius, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useAppearance } from '../../screens/registry/support/forced-variant';
import { usePlusState } from '../../state/plus-context';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { sessionInks } from '../session/ui/session-inks';

import { HoldPreview, Preview, RolledPreview, STAND_IN } from './catch-with-previews';
import { Page } from './page';
import { Note } from './rows';

type CatchWith = SettingsRow['catchWith'];

const WAYS = [
  { id: 'rolled', label: 'finishWith.rolled', sub: 'finishWith.rolled.sub' },
  { id: 'hold', label: 'finishWith.hold', sub: 'finishWith.hold.sub' },
] as const satisfies readonly { id: CatchWith; label: string; sub: string }[];

export interface FinishWithPageProps {
  readonly catchWith: CatchWith;
  /** Today's monster, drawn in the previews; `null` draws a stand-in. */
  readonly monster: MonsterRow | null;
  readonly onChoose: (catchWith: CatchWith) => void;
  readonly onClose: () => void;
}

/**
 * "Catch with": who a session opens on. Rolled puts the monster and its catch on the screen with
 * Scootch in the corner; Hold puts Scootch at work on the screen with the monster in the corner
 * and the hold to finish at the foot. Each is drawn as the session draws it, and in a session a
 * tap on the corner swaps them, so this only chooses which comes first.
 */
export function FinishWithPage({ catchWith, monster, onChoose, onClose }: FinishWithPageProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();
  const scheme = useAppearance();
  const { ink } = usePlusState().look;
  const inks = useMemo(() => sessionInks(scheme, ink), [scheme, ink]);
  const shown = monster ?? STAND_IN;
  return (
    <Page title={t('settings.finishWith')} onClose={onClose} testID="finish-with">
      <View accessibilityRole="radiogroup" style={largeText ? styles.stacked : styles.pair}>
        {WAYS.map((way) => {
          const selected = way.id === catchWith;
          return (
            <PressSpring
              key={way.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${t(way.label)}. ${t(way.sub)}`}
              accessibilityHint={t('finishWith.choose.hint')}
              feedback="choice"
              onPress={() => onChoose(way.id)}
              testID={`finish-with-${way.id}`}
              style={[
                styles.card,
                largeText ? null : styles.half,
                {
                  backgroundColor: palette.surface,
                  borderColor: selected ? palette.ink : 'transparent',
                },
              ]}
            >
              <Preview inks={inks} style={styles.preview}>
                {(width) =>
                  way.id === 'rolled' ? (
                    <RolledPreview width={width} monster={shown} inks={inks} />
                  ) : (
                    <HoldPreview width={width} monster={shown} inks={inks} />
                  )
                }
              </Preview>
              <View style={styles.title}>
                <Text
                  allowFontScaling={allowFontScaling}
                  style={[styles.label, { color: palette.ink, fontSize: size(17) }]}
                >
                  {t(way.label)}
                </Text>
                <View
                  style={[styles.mark, { borderColor: selected ? palette.ink : palette.muted }]}
                >
                  {selected ? (
                    <View style={[styles.dot, { backgroundColor: palette.ink }]} />
                  ) : null}
                </View>
              </View>
              <Text
                allowFontScaling={allowFontScaling}
                style={[styles.sub, { color: palette.muted, fontSize: size(14) }]}
              >
                {t(way.sub)}
              </Text>
            </PressSpring>
          );
        })}
      </View>
      <Note text={t('finishWith.swap')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  stacked: { gap: spacing.sm },
  half: { flex: 1 },
  card: {
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  preview: { borderRadius: radius.lg - spacing.sm / 2, marginBottom: spacing.xs },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  label: { flexShrink: 1, fontFamily: fonts.heading, fontWeight: '700' },
  mark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sub: { fontFamily: fonts.body, paddingHorizontal: spacing.xs, paddingBottom: spacing.xs },
});
