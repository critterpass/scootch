import { Pressable, StyleSheet, View } from 'react-native';

import { WORK_MODE_IDS, type TableSeat, type WorkMode } from '@scootch/domain';
import { radius, spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

import { Words } from './words';

export interface SeatProps {
  readonly seat: TableSeat;
  readonly yours: boolean;
  /** The person's own work mode. Other seats arrive as words only, so they sit at work plainly. */
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
  const { palette, reducedMotion } = useScreenStyle();
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
    <Pressable
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
        (chosen ?? yours) && { backgroundColor: `${palette.ink}0F` },
      ]}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Scootch
          mood="working"
          workMode={workMode ?? null}
          reducedMotion={reducedMotion}
          size={size}
        />
      </View>
      <Words centred>{name}</Words>
      {seat.label === '' ? null : (
        <Words kind="quiet" centred>
          {seat.label}
        </Words>
      )}
    </Pressable>
  );
}

/** A seat nobody has taken yet. */
export function OpenSeat({ size = 96 }: { readonly size?: number }) {
  const t = useT();
  const { palette } = useScreenStyle();
  return (
    <View accessible accessibilityLabel={t('table.openSeat')} style={styles.seat}>
      <View
        style={[styles.empty, { width: size, height: size, borderColor: `${palette.ink}33` }]}
      />
      <Words kind="quiet" centred>
        {t('table.openSeat')}
      </Words>
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
  empty: { borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed' },
});
