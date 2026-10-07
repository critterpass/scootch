import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Energy } from '@scootch/domain';
import { fonts, radius, spacing } from '@scootch/tokens';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { CapsuleButton, type CapsuleButtonProps } from '../../ui/buttons';
import { GlassSurface } from '../../ui/glass-surface';
import { useScreenStyle } from '../../ui/use-screen-style';
import { PressSpring } from '../../ui/motion/press-spring';

const LABEL_SIZE = 13;
/** The one thing as a headline: 34 on a line of 1.07, as the board sets it. */
const HEADING_SIZE = 34;
const HEADING_LINE = 1.07;
const SUB_SIZE = 17;
const SUB_LINE = 1.42;
const SMALL_SIZE = 15;

export interface HeadedProps {
  /** The small line above: "Today's one thing". */
  readonly label: string;
  /** The task, in its own words. */
  readonly heading: string | null;
  /** What Scootch says about it, from the store's lines; `null` when he says nothing. */
  readonly said?: string | null;
  readonly testID?: string;
}

/** A small label, the task as a heading, and Scootch's sentence under it. */
export function Headed({ label, heading, said = null, testID }: HeadedProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const { language } = useLanguage();
  // Vietnamese stacks its marks: its headline gets a line of at least 1.2.
  const headingLine = language === 'vi' ? Math.max(HEADING_LINE, 1.2) : HEADING_LINE;
  return (
    <View testID={testID} style={styles.headed}>
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.label, { color: palette.muted, fontSize: size(LABEL_SIZE) }]}
      >
        {label.toLocaleUpperCase()}
      </Text>
      {heading === null ? null : (
        <Text
          accessibilityRole="header"
          allowFontScaling={allowFontScaling}
          style={[
            styles.heading,
            {
              color: palette.ink,
              fontSize: size(HEADING_SIZE),
              lineHeight: size(HEADING_SIZE) * headingLine,
            },
          ]}
        >
          {heading}
        </Text>
      )}
      {said === null ? null : (
        <Text
          testID={testID ? `${testID}-said` : undefined}
          allowFontScaling={allowFontScaling}
          style={[
            styles.sub,
            {
              color: palette.muted,
              fontSize: size(SUB_SIZE),
              lineHeight: size(SUB_SIZE) * SUB_LINE,
            },
          ]}
        >
          {said}
        </Text>
      )}
    </View>
  );
}

type Choice = Pick<CapsuleButtonProps, 'label' | 'hint' | 'onPress' | 'testID' | 'disabled'>;

/** The dock's two choices: the quiet one, and the one action in ink. They stack at large text. */
export function ChoiceDock({ quiet, action }: { readonly quiet: Choice; readonly action: Choice }) {
  const { largeText } = useScreenStyle();
  return (
    <GlassSurface style={styles.dock}>
      <View style={[styles.dockRow, largeText && styles.stacked]}>
        <CapsuleButton {...quiet} tone="quiet" style={largeText ? undefined : styles.half} />
        <CapsuleButton {...action} style={largeText ? undefined : styles.half} />
      </View>
    </GlassSurface>
  );
}

export interface DeadlineCardProps {
  /** The line that says the date out loud, as the task call wrote it. */
  readonly said: string;
  /** When it comes back, in interface words. */
  readonly back: string;
  readonly keepLabel: string;
  readonly onKeep: () => void;
  readonly onToday: () => void;
}

/** A heard date, said before the person sees anything parked, with its two answers. */
export function DeadlineCard({ said, back, keepLabel, onKeep, onToday }: DeadlineCardProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();
  return (
    <View
      testID="deadline-heard"
      style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.tomato }]}
    >
      <View style={styles.cardHead}>
        <View
          accessible
          accessibilityLabel={t('deadline.mark')}
          style={[styles.mark, { backgroundColor: palette.tomato }]}
        >
          <Text allowFontScaling={false} style={[styles.markText, { color: palette.page }]}>
            !
          </Text>
        </View>
        <View style={styles.cardWords}>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.cardSaid, { color: palette.ink, fontSize: size(SUB_SIZE) }]}
          >
            {said}
          </Text>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.sub, { color: palette.muted, fontSize: size(SMALL_SIZE) }]}
          >
            {back}
          </Text>
        </View>
      </View>
      <View style={[styles.cardChoices, largeText && styles.stacked]}>
        <CapsuleButton
          label={keepLabel}
          hint={t('deadline.keep.hint')}
          onPress={onKeep}
          testID="deadline-keep"
        />
        <CapsuleButton
          label={t('deadline.today')}
          hint={t('deadline.today.hint')}
          tone="quiet"
          onPress={onToday}
          testID="deadline-today"
        />
      </View>
    </View>
  );
}

const ENERGIES: readonly Energy[] = ['low', 'medium', 'fine'];

/** The battery question: three taps, or Scootch guesses from how the words were written. */
export function EnergyRead({
  onAnswer,
}: {
  readonly onAnswer: (energy: Energy | 'guess') => void;
}) {
  const { largeText } = useScreenStyle();
  const t = useT();
  return (
    <View testID="energy-read" style={styles.energy}>
      <Headed label={t('brand.name')} heading={t('energy.ask')} />
      <View accessibilityRole="radiogroup" style={[styles.energyRow, largeText && styles.stacked]}>
        {ENERGIES.map((energy) => (
          <CapsuleButton
            key={energy}
            label={t(`energy.${energy}`)}
            hint={t('energy.hint')}
            tone="quiet"
            onPress={() => onAnswer(energy)}
            testID={`energy-${energy}`}
            style={largeText ? undefined : styles.half}
          />
        ))}
      </View>
      <CapsuleButton
        label={t('energy.guess')}
        hint={t('energy.hint')}
        tone="quiet"
        onPress={() => onAnswer('guess')}
        testID="energy-guess"
      />
    </View>
  );
}

/** A quiet text control under the content: "Peek in the drawer", "Not now". */
export function QuietLink({
  label,
  hint,
  onPress,
  testID,
}: Pick<CapsuleButtonProps, 'label' | 'hint' | 'onPress' | 'testID'>) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      testID={testID}
      hitSlop={spacing.sm}
      style={styles.link}
    >
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.linkText, { color: palette.ink, fontSize: size(SMALL_SIZE) }]}
      >
        {label}
      </Text>
    </PressSpring>
  );
}

export function Stack({ children }: { readonly children: ReactNode }) {
  return <View style={styles.stack}>{children}</View>;
}

const styles = StyleSheet.create({
  headed: { gap: 12 },
  label: { fontFamily: fonts.body, fontWeight: '600', letterSpacing: 0.26 },
  heading: { fontFamily: fonts.heading, fontWeight: '700', letterSpacing: -0.68 },
  sub: { fontFamily: fonts.body },
  dock: { borderRadius: 34, padding: 7, overflow: 'hidden' },
  dockRow: { flexDirection: 'row', gap: spacing.xs },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  half: { flexGrow: 1, flexBasis: 0 },
  card: { borderRadius: radius.lg + 4, borderWidth: 1.5, padding: spacing.md, gap: spacing.md },
  cardHead: { flexDirection: 'row', gap: spacing.sm },
  cardWords: { flex: 1, gap: spacing.xs },
  cardSaid: { fontFamily: fonts.heading, fontWeight: '700' },
  cardChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  markText: { fontFamily: fonts.heading, fontWeight: '700', fontSize: 14 },
  energy: { gap: spacing.md },
  energyRow: { flexDirection: 'row', gap: spacing.sm },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { fontFamily: fonts.heading, fontWeight: '600' },
  stack: { gap: spacing.md },
});
