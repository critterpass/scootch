import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, CONTROL_HEIGHT, DOCK_PADDING, onInkOf } from '../../ui/buttons';
import { GlassSurface } from '../../ui/glass-surface';
import { BinIcon, TableIcon } from '../../ui/icons';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';

import { BitesSheet } from './bites-sheet';
import { GuessSheet } from './guess-sheet';
import { guessLabel, type TaskSetHelpers } from './task-set-helpers';

/** The height of a helper chip, and the side of the round button beside them. */
const CHIP_HEIGHT = 40;
const CHIP_SIZE = 15;
/** The three bites as the round button draws them: each smaller than the one before. */
const BITE_DOTS = [9, 7, 5] as const;

export interface TaskSetDockProps {
  /** The label of the one action, when it is not the plain "Start". */
  readonly startLabel?: string | undefined;
  /** A glyph before the label: the table, when the start is at one. */
  readonly startIcon?: 'table' | undefined;
  readonly minutes: number;
  /** `null` draws Start disabled: it would be refused. */
  readonly onStart: (() => void) | null;
  /** The task is put down. Unset, no button is drawn for it. */
  readonly onDiscard?: (() => void) | undefined;
  /** The quiet helpers above the one action. Unset, or with neither, the dock is the action alone. */
  readonly helpers?: TaskSetHelpers | undefined;
}

/**
 * The dock under a set task: the one action, with the small round way to put the task down at its
 * left. At the large text sizes the two stack, and the quiet one is written out.
 *
 * Above the action, where the task has them, sit its quiet helpers in one row that wraps before it
 * cuts a label short: the guess as a chip, which reads the guess back once made, and at the far
 * end the round button that opens the bites. Each opens a sheet; none of them stands before Start.
 */
export function TaskSetDock({
  startLabel,
  startIcon,
  minutes,
  onStart,
  onDiscard,
  helpers,
}: TaskSetDockProps) {
  const { palette, largeText, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  const guess = helpers?.guess ?? null;
  const bites = helpers?.bites ?? null;
  const [sheet, setSheet] = useState<'guess' | 'bites' | null>(helpers?.opened ?? null);
  const close = () => setSheet(null);
  const outline = { borderColor: `${palette.ink}26` };
  const discard = { label: t('taskSet.discard'), hint: t('taskSet.discard.hint') };
  return (
    <GlassSurface style={styles.dock}>
      {guess === null && bites === null ? null : (
        <View style={styles.helpers} testID="task-set-helpers">
          {guess === null ? null : (
            <PressSpring
              accessibilityRole="button"
              accessibilityLabel={
                guess.minutes === null
                  ? t('guess.chip')
                  : `${t('guess.chip')}: ${t(guessLabel(guess.minutes))}`
              }
              accessibilityHint={
                guess.minutes === null ? t('guess.chip.hint') : t('guess.chip.made.hint')
              }
              onPress={() => setSheet('guess')}
              feedback="choice"
              testID="task-set-guess"
              style={[styles.chip, outline]}
            >
              <Text
                allowFontScaling={allowFontScaling}
                style={[
                  styles.chipLabel,
                  {
                    color: guess.minutes === null ? palette.muted : palette.ink,
                    fontSize: size(CHIP_SIZE),
                    lineHeight: size(CHIP_SIZE) * 1.3,
                  },
                ]}
              >
                {guess.minutes === null ? t('guess.chip') : t(guessLabel(guess.minutes))}
              </Text>
            </PressSpring>
          )}
          {bites === null ? null : (
            <PressSpring
              accessibilityRole="button"
              accessibilityLabel={t('bites.open')}
              accessibilityHint={t('bites.open.hint')}
              onPress={() => setSheet('bites')}
              feedback="choice"
              testID="task-set-bites"
              style={[styles.bites, outline]}
            >
              {BITE_DOTS.map((dot) => (
                <View
                  key={dot}
                  style={{
                    width: dot,
                    height: dot,
                    borderRadius: dot / 2,
                    backgroundColor: palette.ink,
                  }}
                />
              ))}
            </PressSpring>
          )}
        </View>
      )}
      <View style={[styles.actions, !largeText && styles.row]}>
        {onDiscard === undefined || largeText ? null : (
          <PressSpring
            accessibilityRole="button"
            accessibilityLabel={discard.label}
            accessibilityHint={discard.hint}
            onPress={onDiscard}
            feedback="choice"
            testID="task-discard"
            style={[styles.discard, { backgroundColor: `${palette.ink}0F` }]}
          >
            <BinIcon color={palette.ink} />
          </PressSpring>
        )}
        <CapsuleButton
          label={startLabel ?? t('session.start')}
          hint={t('taskSet.start.hint', { minutes })}
          {...(startIcon === 'table' ? { icon: <TableIcon color={onInkOf(palette)} /> } : {})}
          disabled={onStart === null}
          onPress={onStart ?? (() => undefined)}
          testID="one-action"
          style={largeText ? undefined : styles.start}
        />
        {onDiscard !== undefined && largeText ? (
          <CapsuleButton tone="quiet" {...discard} onPress={onDiscard} testID="task-discard" />
        ) : null}
      </View>
      {guess === null ? null : (
        <GuessSheet
          open={sheet === 'guess'}
          minutes={guess.minutes}
          onGuess={guess.onGuess}
          onClose={close}
        />
      )}
      {bites === null ? null : (
        <BitesSheet
          open={sheet === 'bites'}
          name={bites.name}
          rows={bites.rows}
          onTick={bites.onTick}
          onClose={close}
        />
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  dock: {
    borderRadius: CONTROL_HEIGHT / 2 + DOCK_PADDING,
    padding: DOCK_PADDING,
    gap: DOCK_PADDING,
    overflow: 'hidden',
  },
  actions: {
    gap: DOCK_PADDING,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  chip: {
    minHeight: CHIP_HEIGHT,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontFamily: fonts.body,
    fontWeight: '500',
  },
  // At the far end of the row, wherever the chips before it wrap.
  bites: {
    marginLeft: 'auto',
    width: CHIP_HEIGHT,
    height: CHIP_HEIGHT,
    borderRadius: CHIP_HEIGHT / 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  start: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  discard: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
