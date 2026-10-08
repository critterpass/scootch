import { StyleSheet, Text, View } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

import { CapsuleButton, GlassDock, onInkOf, type CapsuleButtonProps } from '../../ui/buttons';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';

const CHIP_SIZE = 15;
const STEP_SIZE = 15;
const LABEL_SIZE = 13;

export interface ChipChoiceProps<T extends string> {
  /** The small label over the chips, which also names the group for a screen reader. */
  readonly label: string;
  readonly hint: string;
  readonly chosen: T | null;
  readonly choices: readonly { readonly value: T; readonly label: string }[];
  readonly onChoose: (value: T) => void;
  readonly testPrefix: string;
}

/**
 * A handful of choices, all in view: small chips that wrap, the chosen one in ink. The sheet they
 * are on is as tall as its content, so nothing here opens or closes and the sheet never jumps.
 */
export function ChipChoice<T extends string>(props: ChipChoiceProps<T>) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={props.label}>
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.label, { color: palette.muted, fontSize: size(LABEL_SIZE) }]}
      >
        {props.label.toLocaleUpperCase()}
      </Text>
      <View style={styles.chips}>
        {props.choices.map((choice) => {
          const chosen = choice.value === props.chosen;
          return (
            <PressSpring
              key={choice.value}
              accessibilityRole="radio"
              accessibilityLabel={choice.label}
              accessibilityHint={props.hint}
              accessibilityState={{ selected: chosen }}
              onPress={() => props.onChoose(choice.value)}
              feedback="choice"
              testID={`${props.testPrefix}-${choice.value}`}
              style={[styles.chip, { backgroundColor: chosen ? palette.ink : `${palette.ink}0F` }]}
            >
              <Text
                allowFontScaling={allowFontScaling}
                maxFontSizeMultiplier={1.6}
                style={[
                  styles.chipText,
                  { color: chosen ? onInkOf(palette) : palette.ink, fontSize: size(CHIP_SIZE) },
                ]}
              >
                {choice.label}
              </Text>
            </PressSpring>
          );
        })}
      </View>
    </View>
  );
}

/** What a haunt is, in three numbered steps, for someone who has nobody to haunt yet. */
export function HauntGuide({ steps }: { readonly steps: readonly string[] }) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <View style={[styles.guide, { backgroundColor: palette.surface }]} testID="haunt-guide">
      {steps.map((step, index) => (
        <View key={index} style={styles.step}>
          <View style={[styles.mark, { backgroundColor: palette.risoBlob }]}>
            <Text allowFontScaling={false} style={[styles.markText, { color: palette.ink }]}>
              {index + 1}
            </Text>
          </View>
          <Text
            allowFontScaling={allowFontScaling}
            style={[
              styles.stepText,
              {
                color: palette.ink,
                fontSize: size(STEP_SIZE),
                lineHeight: size(STEP_SIZE) * 1.35,
              },
            ]}
          >
            {step}
          </Text>
        </View>
      ))}
    </View>
  );
}

type Choice = Pick<CapsuleButtonProps, 'label' | 'hint' | 'onPress' | 'testID' | 'disabled'>;

/**
 * A sheet's two choices: the quiet way out and the one action, which is half as wide again so a
 * longer label stays on one line. They stack at the large text sizes.
 */
export function SheetDock({ quiet, action }: { readonly quiet: Choice; readonly action?: Choice }) {
  const { largeText } = useScreenStyle();
  return (
    <GlassDock style={largeText ? styles.stacked : styles.row}>
      <CapsuleButton {...quiet} tone="quiet" style={largeText ? undefined : styles.quiet} />
      {action === undefined ? null : (
        <CapsuleButton {...action} style={largeText ? undefined : styles.action} />
      )}
    </GlassDock>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  label: { fontFamily: fonts.body, fontWeight: '600', letterSpacing: 0.26 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 38, borderRadius: 19, paddingHorizontal: 14, justifyContent: 'center' },
  chipText: { fontFamily: fonts.body, fontWeight: '500' },
  guide: { borderRadius: 22, padding: spacing.md, gap: 12 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  mark: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  markText: { fontFamily: fonts.heading, fontWeight: '700', fontSize: 14 },
  stepText: { flex: 1, fontFamily: fonts.body, paddingTop: 2 },
  row: { flexDirection: 'row', gap: spacing.xs },
  stacked: { gap: spacing.xs },
  quiet: { flexGrow: 1, flexBasis: 0 },
  action: { flexGrow: 1.5, flexBasis: 0 },
});
