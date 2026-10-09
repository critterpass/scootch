import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, radius, spacing } from '@scootch/tokens';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { CapsuleButton, type CapsuleButtonProps } from '../../ui/buttons';
import { glassPressOwner, GlassSurface } from '../../ui/glass-surface';
import { useScreenStyle } from '../../ui/use-screen-style';
import { PressSpring } from '../../ui/motion/press-spring';
import { RisingWords } from '../../ui/motion/rising-words';

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
  /**
   * True for the one thing as it lands: its words arrive one after another. Never for a task
   * that asked for care, which is simply said.
   */
  readonly lively?: boolean;
  readonly testID?: string;
}

/** A small label, the task as a heading, and Scootch's sentence under it. */
export function Headed({ label, heading, said = null, lively = false, testID }: HeadedProps) {
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
      {heading === null ? null : lively ? (
        <RisingWords
          text={heading}
          allowFontScaling={allowFontScaling}
          style={{
            ...styles.heading,
            color: palette.ink,
            fontSize: size(HEADING_SIZE),
            lineHeight: size(HEADING_SIZE) * headingLine,
          }}
        />
      ) : (
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
  const t = useT();
  return (
    <HeardCard testID="deadline-heard" mark={t('deadline.mark')} said={said} under={back}>
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
    </HeardCard>
  );
}

export interface HeardCardProps {
  readonly testID: string;
  /** What the mark before it is read out as: "Deadline". */
  readonly mark: string;
  /** What was heard, said back in a few words. */
  readonly said: string;
  /** The sentence under it. */
  readonly under: string;
  /** Its answers, side by side; they stack at large text. */
  readonly children: ReactNode;
}

/** Something heard in the words, said back on the one thing with its answers: a date, a time. */
export function HeardCard({ testID, mark, said, under, children }: HeardCardProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  return (
    <View
      testID={testID}
      style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.tomato }]}
    >
      <View style={styles.cardHead}>
        <View
          accessible
          accessibilityLabel={mark}
          style={[styles.mark, { backgroundColor: palette.tomato }]}
        >
          <Text allowFontScaling={false} style={[styles.markText, { color: palette.page }]}>
            !
          </Text>
        </View>
        <View style={styles.cardWords}>
          <Text
            testID={`${testID}-said`}
            allowFontScaling={allowFontScaling}
            style={[styles.cardSaid, { color: palette.ink, fontSize: size(SUB_SIZE) }]}
          >
            {said}
          </Text>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.sub, { color: palette.muted, fontSize: size(SMALL_SIZE) }]}
          >
            {under}
          </Text>
        </View>
      </View>
      <View style={[styles.cardChoices, largeText && styles.stacked]}>{children}</View>
    </View>
  );
}

export interface QuietLinkProps extends Pick<
  CapsuleButtonProps,
  'label' | 'hint' | 'onPress' | 'testID'
> {
  /** A small glyph before the words. */
  readonly icon?: ReactNode;
}

/**
 * The quiet control under a screen's content: a small glass chip, as the example chips under the
 * first ask are, with its words and sometimes a glyph. Every secondary way on is drawn as one of
 * these: never as bare words standing in a row of their own.
 */
export function QuietLink({ label, hint, onPress, testID, icon }: QuietLinkProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      testID={testID}
      feedback="choice"
      hitSlop={spacing.sm}
      answeredBy={glassPressOwner(true)}
      style={styles.link}
    >
      <GlassSurface interactive style={styles.chip}>
        <View pointerEvents="none" style={styles.chipInner}>
          {icon}
          <Text
            allowFontScaling={allowFontScaling}
            style={[
              styles.linkText,
              {
                color: palette.ink,
                fontSize: size(SMALL_SIZE),
                lineHeight: size(SMALL_SIZE) * 1.3,
              },
            ]}
          >
            {label}
          </Text>
        </View>
      </GlassSurface>
    </PressSpring>
  );
}

/** Quiet controls side by side, wrapping where they do not fit. */
export function QuietRow({ children }: { readonly children: ReactNode }) {
  return <View style={styles.quietRow}>{children}</View>;
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
  link: { alignSelf: 'flex-start' },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8.75, overflow: 'hidden' },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkText: { fontFamily: fonts.body, fontWeight: '500' },
  quietRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stack: { gap: spacing.md },
});
