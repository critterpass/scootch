import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fonts } from '@phusclass/tokens';

import { HAND_FAMILY } from '../../classroom/use-hand-font';
import { useT } from '../../i18n/i18n-provider';
import type { AnimatedViewStyle } from '../../ui/motion/animated-style';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { ClassIcon } from '../desk/class-icons';

import type { RowAction } from './board-row';
import type { BoardRow } from './board-rows';
import { BOARD, CHALK } from './chalk';
import { TallyMarks } from './chalk-marks';

type SwipeAction = 'desk' | 'tick' | 'erase';

/**
 * The corner of a row: its tally marks (and the front-row tag), its date, or, on old chalk, Keep
 * and Let go.
 */
export function RowCorner({
  row,
  index,
  onAct,
}: {
  readonly row: BoardRow;
  readonly index: number;
  readonly onAct: (action: RowAction) => void;
}) {
  const t = useT();
  const { size, allowFontScaling, largeText } = useScreenStyle();
  const markSize = size(BOARD.markSize);
  const markScale = allowFontScaling ? 1 : markSize / BOARD.markSize;

  if (row.faded) {
    return (
      <View style={[styles.fadeChoices, largeText ? styles.fadeChoicesLarge : null]}>
        <PressSpring
          testID={`board-keep-${index}`}
          accessibilityRole="button"
          onPress={() => onAct('keep')}
          style={[styles.smallPill, styles.keep]}
          hitSlop={8}
        >
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.pillText, { fontSize: size(13) }]}
          >
            {t('board.stillYours.keep')}
          </Text>
        </PressSpring>
        <PressSpring
          testID={`board-let-go-${index}`}
          accessibilityRole="button"
          onPress={() => onAct('letGo')}
          style={[styles.smallPill, styles.letGo]}
          hitSlop={8}
        >
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.pillText, styles.letGoText, { fontSize: size(13) }]}
          >
            {t('board.stillYours.letGo')}
          </Text>
        </PressSpring>
      </View>
    );
  }
  return (
    <View style={styles.mark}>
      {row.mark.kind === 'tally' ? (
        <>
          <TallyMarks count={row.mark.count} scale={markScale} />
          {row.mark.frontRow ? (
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.frontRow, { fontSize: size(12) }]}
            >
              {t('board.frontRow')}
            </Text>
          ) : null}
        </>
      ) : row.mark.kind === 'date' ? (
        <Text allowFontScaling={allowFontScaling} style={[styles.date, { fontSize: markSize }]}>
          {row.mark.label}
        </Text>
      ) : null}
    </View>
  );
}

/** The actions behind a row, uncovered as it slides left. VoiceOver reaches them by name. */
export function SwipeActions({
  actions,
  index,
  style,
  onAct,
}: {
  readonly actions: readonly SwipeAction[];
  readonly index: number;
  readonly style: AnimatedViewStyle;
  readonly onAct: (action: RowAction) => void;
}) {
  const t = useT();
  const { size, allowFontScaling } = useScreenStyle();
  const text: Record<SwipeAction, string> = {
    desk: t('board.action.desk'),
    tick: t('board.action.tick'),
    erase: t('board.action.erase'),
  };
  const ink: Record<SwipeAction, string> = {
    desk: CHALK.toDesk,
    tick: CHALK.tick,
    erase: CHALK.erase,
  };
  return (
    <Animated.View
      style={[styles.actions, style]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {actions.map((action) => (
        <PressSpring
          key={action}
          testID={`board-swipe-${action}-${index}`}
          onPress={() => onAct(action)}
          style={[styles.action, { backgroundColor: ink[action] }]}
        >
          {action === 'desk' ? null : (
            <ClassIcon
              name={action === 'tick' ? 'check' : 'eraser'}
              color={CHALK.white}
              size={16}
              weight={action === 'tick' ? 2.6 : 2.2}
            />
          )}
          <Text
            allowFontScaling={allowFontScaling}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.actionText, { fontSize: size(13) }]}
          >
            {text[action]}
          </Text>
        </PressSpring>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  actions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  actionText: {
    color: CHALK.white,
    fontWeight: '700',
    fontFamily: fonts.body,
  },
  mark: {
    alignItems: 'flex-end',
    gap: 2,
  },
  date: {
    fontFamily: HAND_FAMILY,
    color: CHALK.date,
  },
  frontRow: {
    color: CHALK.tally,
    fontWeight: '700',
    fontFamily: fonts.body,
  },
  fadeChoices: {
    flexDirection: 'row',
    gap: 6,
  },
  fadeChoicesLarge: {
    marginLeft: 22,
  },
  smallPill: {
    minHeight: 28,
    paddingHorizontal: 11,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keep: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  letGo: {
    borderWidth: 1.5,
    borderColor: CHALK.pillLine,
  },
  letGoText: {
    color: CHALK.chalk,
  },
  pillText: {
    color: CHALK.white,
    fontWeight: '700',
    fontFamily: fonts.body,
  },
});
