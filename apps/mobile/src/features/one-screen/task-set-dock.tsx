import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, CONTROL_HEIGHT, DOCK_PADDING, onInkOf } from '../../ui/buttons';
import { GlassSurface } from '../../ui/glass-surface';
import { BinIcon, TableIcon } from '../../ui/icons';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';

import { BitesSheet } from './bites-sheet';
import { GuessSheet } from './guess-sheet';
import { CHIP_HEIGHT, HelperChip } from './helper-chip';
import { guessLabel, type TaskSetHelpers } from './task-set-helpers';
import { cueOpening, WhenSheet } from './when-sheet';

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
  /**
   * "Save for later", beside the one action, while a cue is picked and not yet kept. The one
   * action is then the quiet "Start now", and the way to put the task down steps aside.
   */
  readonly onSave?: (() => void) | undefined;
}

/**
 * The dock under a set task: the one action, with the small round way to put the task down at its
 * left. At the large text sizes the two stack, and the quiet one is written out.
 *
 * Above the action, where the task has them, sit its quiet helpers in one row that wraps before it
 * cuts a label short: the guess and the when as chips, which read back what was picked, and at the
 * far end the round button that opens the bites. Each opens a sheet; none stands before Start.
 */
export function TaskSetDock({
  startLabel,
  startIcon,
  minutes,
  onStart,
  onDiscard,
  helpers,
  onSave,
}: TaskSetDockProps) {
  const { palette, largeText } = useScreenStyle();
  const t = useT();
  const guess = helpers?.guess ?? null;
  const when = helpers?.when ?? null;
  const bites = helpers?.bites ?? null;
  const [sheet, setSheet] = useState<'guess' | 'when' | 'bites' | null>(helpers?.opened ?? null);
  const close = () => setSheet(null);
  const outline = { borderColor: `${palette.ink}26` };
  const discard = { label: t('taskSet.discard'), hint: t('taskSet.discard.hint') };
  return (
    <GlassSurface style={styles.dock}>
      {guess === null && when === null && bites === null ? null : (
        <View style={styles.helpers} testID="task-set-helpers">
          {guess === null ? null : (
            <HelperChip
              label={guess.minutes === null ? t('guess.chip') : t(guessLabel(guess.minutes))}
              spokenLabel={
                guess.minutes === null
                  ? t('guess.chip')
                  : `${t('guess.chip')}: ${t(guessLabel(guess.minutes))}`
              }
              hint={guess.minutes === null ? t('guess.chip.hint') : t('guess.chip.made.hint')}
              set={guess.minutes !== null}
              onPress={() => setSheet('guess')}
              testID="task-set-guess"
            />
          )}
          {when === null ? null : (
            <HelperChip
              label={when.cue === null ? t('when.chip') : cueOpening(t, when.cue)}
              spokenLabel={
                when.cue === null ? t('when.chip') : `${t('when.chip')}: ${cueOpening(t, when.cue)}`
              }
              hint={when.cue === null ? t('when.chip.hint') : t('when.chip.set.hint')}
              set={when.cue !== null}
              onPress={() => setSheet('when')}
              testID="task-set-when"
            />
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
        {onDiscard === undefined || largeText || onSave !== undefined ? null : (
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
        {onSave === undefined ? null : (
          <CapsuleButton
            tone="quiet"
            label={t('when.startNow')}
            hint={t('taskSet.start.hint', { minutes })}
            disabled={onStart === null}
            onPress={onStart ?? (() => undefined)}
            testID="one-action"
            style={largeText ? undefined : styles.start}
          />
        )}
        <CapsuleButton
          label={onSave === undefined ? (startLabel ?? t('session.start')) : t('when.save')}
          hint={onSave === undefined ? t('taskSet.start.hint', { minutes }) : t('when.save.hint')}
          {...(startIcon === 'table' && onSave === undefined
            ? { icon: <TableIcon color={onInkOf(palette)} /> }
            : {})}
          disabled={onSave === undefined && onStart === null}
          onPress={onSave ?? onStart ?? (() => undefined)}
          testID={onSave === undefined ? 'one-action' : 'task-set-save'}
          style={largeText ? undefined : styles.start}
        />
        {onDiscard !== undefined && largeText && onSave === undefined ? (
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
      {when === null ? null : (
        <WhenSheet
          open={sheet === 'when'}
          cue={when.cue}
          moments={when.moments}
          onCue={when.onCue}
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
