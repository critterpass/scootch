import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TableSeat, WorkMode } from '@scootch/domain';
import { spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useTableState } from '../../state/together-context';
import { useScreenStyle } from '../../ui/use-screen-style';

import { labelModeFor } from './table-rules';
import { Words } from './words';

export interface TableStripViewProps {
  readonly seats: readonly TableSeat[];
  readonly you: string | null;
  readonly workMode: WorkMode | null;
  readonly reconnecting: boolean;
}

/** The table's critters, small, above a running session. One element to a screen reader. */
export function TableStripView({ seats, you, workMode, reconnecting }: TableStripViewProps) {
  const t = useT();
  const { palette, reducedMotion } = useScreenStyle();
  const here = seats.filter((seat) => seat.online).length;
  return (
    <View
      accessible
      accessibilityLabel={[
        t('table.strip', { count: here }),
        ...(reconnecting ? [t('table.reconnecting')] : []),
      ].join('. ')}
      testID="table-strip"
      style={[styles.strip, { backgroundColor: palette.page }]}
    >
      <View style={styles.row}>
        {seats.map((seat) => (
          <View key={seat.userId} style={{ opacity: seat.online ? 1 : 0.4 }}>
            <Scootch
              mood="working"
              workMode={seat.userId === you ? workMode : null}
              reducedMotion={reducedMotion}
              ownLoop={false}
              seed={seat.userId}
              size={36}
            />
          </View>
        ))}
      </View>
      {reconnecting ? (
        <Words kind="quiet" centred testID="table-strip-reconnecting">
          {t('table.reconnecting')}
        </Words>
      ) : null}
    </View>
  );
}

/** Shown over the session only while the person has a seat at a table. */
export function TableStrip() {
  const table = useTableState();
  const { today } = useToday();
  const insets = useSafeAreaInsets();
  if (table.tableId === null || today.kind === 'crisis') return null;
  return (
    <View style={{ paddingTop: insets.top }}>
      <TableStripView
        seats={table.seats}
        you={table.you}
        workMode={labelModeFor('task' in today ? today.task : null)}
        reconnecting={table.status === 'reconnecting' || table.status === 'connecting'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { alignItems: 'center', paddingVertical: spacing.xs, gap: 2 },
  row: { flexDirection: 'row', gap: spacing.sm },
});
