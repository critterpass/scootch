import { StyleSheet } from 'react-native';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, CONTROL_HEIGHT, DOCK_PADDING } from '../../ui/buttons';
import { GlassSurface } from '../../ui/glass-surface';
import { BinIcon } from '../../ui/icons';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';

export interface TaskSetDockProps {
  /** The label of the one action, when it is not the plain "Start". */
  readonly startLabel?: string | undefined;
  readonly minutes: number;
  /** `null` draws Start disabled: it would be refused. */
  readonly onStart: (() => void) | null;
  /** The task is put down. Unset, no button is drawn for it. */
  readonly onDiscard?: (() => void) | undefined;
}

/**
 * The dock under a set task: the one action, with the small round way to put the task down at its
 * left. At the large text sizes the two stack, and the quiet one is written out.
 */
export function TaskSetDock({ startLabel, minutes, onStart, onDiscard }: TaskSetDockProps) {
  const { palette, largeText } = useScreenStyle();
  const t = useT();
  const discard = { label: t('taskSet.discard'), hint: t('taskSet.discard.hint') };
  return (
    <GlassSurface style={[styles.dock, !largeText && styles.row]}>
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
        disabled={onStart === null}
        onPress={onStart ?? (() => undefined)}
        testID="one-action"
        style={largeText ? undefined : styles.start}
      />
      {onDiscard !== undefined && largeText ? (
        <CapsuleButton tone="quiet" {...discard} onPress={onDiscard} testID="task-discard" />
      ) : null}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
