import { Pressable, StyleSheet, View } from 'react-native';

import { CARD_FINISHES } from '@scootch/art';
import type { CardFinish } from '@scootch/domain';
import { spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { SessionText } from '../session/ui/session-text';

import { Lock } from './ui/parts';

/** The finishes in the order the board draws them. The first is free. */
export const FINISH_ORDER: readonly CardFinish[] = ['standard', 'kraft', 'gold', 'night', 'riso'];
export const FREE_FINISH: CardFinish = 'standard';

/** Whether a finish can be put on a card. The finish a card already wears is always its own. */
export function finishOpen(finish: CardFinish, plus: boolean, worn: CardFinish): boolean {
  return plus || finish === FREE_FINISH || finish === worn;
}

export interface FinishPickerProps {
  readonly worn: CardFinish;
  readonly plus: boolean;
  readonly onChoose: (finish: CardFinish) => void;
  /** A locked finish was tapped: the sheet opens, and only then. */
  readonly onLocked: () => void;
}

/** The card finishes under an open card: the standard one, and four more that come with Plus. */
export function FinishPicker({ worn, plus, onChoose, onLocked }: FinishPickerProps) {
  const t = useT();
  const { palette } = useScreenStyle();
  return (
    <View accessibilityRole="radiogroup" style={styles.row} testID="finish-picker">
      {FINISH_ORDER.map((finish) => {
        const inks = CARD_FINISHES[finish];
        const open = finishOpen(finish, plus, worn);
        const chosen = finish === worn;
        return (
          <Pressable
            key={finish}
            accessibilityRole="radio"
            accessibilityState={{ selected: chosen, checked: chosen }}
            accessibilityLabel={t(`finish.${finish}`)}
            accessibilityHint={open ? t('finish.hint') : t('keep.plusOnly.hint')}
            onPress={() => (open ? onChoose(finish) : onLocked())}
            testID={`finish-${finish}`}
            style={styles.item}
          >
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: inks.paper,
                  borderColor: chosen ? palette.tomato : inks.frame,
                },
              ]}
            >
              {open ? null : (
                <View style={[styles.badge, { backgroundColor: palette.surface }]}>
                  <Lock color={palette.ink} />
                </View>
              )}
            </View>
            <SessionText face="caption" color={palette.muted}>
              {t(`finish.${finish}`)}
            </SessionText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  item: { alignItems: 'center', gap: spacing.xs, minWidth: 48 },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
