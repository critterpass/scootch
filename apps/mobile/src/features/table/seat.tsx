import { StyleSheet, Text, View } from 'react-native';

import { WORK_MODE_IDS, type TableSeat, type WorkMode } from '@scootch/domain';
import { fonts, radius, spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { useCharacterMotion } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';

import { Words } from './words';
import { PressSpring } from '../../ui/motion/press-spring';

export interface SeatProps {
  readonly seat: TableSeat;
  readonly yours: boolean;
  /** The work mode drawn: the person's own, or the id the table sent for another seat. */
  readonly workMode?: WorkMode | null;
  readonly chosen?: boolean;
  readonly size?: number;
  readonly onPress?: () => void;
  readonly onLongPress?: () => void;
}

/** Whether a string is one of the work mode ids. */
export function isWorkMode(value: string | null | undefined): value is WorkMode {
  return (WORK_MODE_IDS as readonly string[]).includes(value ?? '');
}

/**
 * One seat: a critter at work, the person's name and their one or two words, exactly as the
 * server sent them. To a screen reader the whole seat is one element.
 */
export function Seat({
  seat,
  yours,
  workMode,
  chosen,
  size = 96,
  onPress,
  onLongPress,
}: SeatProps) {
  const t = useT();
  const { palette } = useScreenStyle();
  const character = useCharacterMotion();
  const name = yours ? t('table.you') : (seat.name ?? t('friends.noName'));
  const spoken = [
    name,
    seat.label,
    t(seat.online ? 'table.seat.here' : 'table.seat.away'),
    ...(yours ? [t('table.seat.yours')] : []),
  ]
    .filter((part) => part !== '')
    .join(', ');
  return (
    <PressSpring
      accessible
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityState={{ selected: chosen === true }}
      {...(yours ? {} : { accessibilityHint: t('table.seat.hint') })}
      onPress={onPress}
      onLongPress={onLongPress}
      testID={`seat-${seat.userId}`}
      style={[
        styles.seat,
        { opacity: seat.online ? 1 : 0.45 },
        chosen === true && { backgroundColor: `${palette.ink}0F` },
      ]}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Scootch
          mood={seat.done === true ? 'celebrating' : 'working'}
          // The person's own critter is tomato; everyone else's is the pale one, as the board draws.
          tone={yours ? 'tomato' : 'paper'}
          workMode={workMode ?? null}
          {...character}
          ownLoop={false}
          seed={seat.userId}
          size={size}
        />
      </View>
      <Words centred>{name}</Words>
      {seat.done === true || seat.label !== '' ? (
        <Words kind="quiet" centred>
          {seat.done === true ? t('table.seat.done') : seat.label}
        </Words>
      ) : null}
    </PressSpring>
  );
}

/** A seat nobody has taken yet: the outline of a critter that is not there, as the board draws it. */
export function OpenSeat({ size = 96 }: { readonly size?: number }) {
  const t = useT();
  const { palette, allowFontScaling, size: textSize } = useScreenStyle();
  return (
    <View accessible accessibilityLabel={t('table.openSeat')} style={styles.seat}>
      <View style={[styles.emptyBox, { width: size, height: size }]}>
        <View
          style={[
            styles.empty,
            {
              width: size * 0.66,
              height: size * 0.49,
              borderTopLeftRadius: size * 0.34,
              borderTopRightRadius: size * 0.34,
              borderBottomLeftRadius: size * 0.21,
              borderBottomRightRadius: size * 0.21,
              borderColor: `${palette.ink}40`,
            },
          ]}
        />
      </View>
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.openLabel, { color: palette.faint, fontSize: textSize(17) }]}
      >
        {t('table.openSeat')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  seat: {
    flexBasis: '45%',
    flexGrow: 1,
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: 2,
  },
  emptyBox: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 14 },
  empty: { borderWidth: 1.5 },
  openLabel: { fontFamily: fonts.body, textAlign: 'center' },
});
