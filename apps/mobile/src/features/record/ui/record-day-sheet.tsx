import { StyleSheet, View } from 'react-native';

import type { Language } from '@scootch/i18n';

import { useT } from '../../../i18n/i18n-provider';
import { CloseIcon } from '../../../ui/icons';
import { PressSpring } from '../../../ui/motion/press-spring';
import { Sheet, SheetScroll } from '../../../ui/sheet/sheet';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { weekdayName } from '../../reveal/weekday-name';
import { SessionText } from '../../session/ui/session-text';
import type { RecordRow } from '../record-week';

import { instrumentName } from './record-parts';

export interface RecordDaySheetProps {
  readonly open: boolean;
  /** The day being looked at. It stays set while the sheet closes, so the sheet leaves full. */
  readonly row: RecordRow | null;
  readonly language: Language;
  readonly onClose: () => void;
}

/**
 * One day of the week's record, opened from its line in the liner notes: the day, the instrument
 * it brought in, and everything caught on it, each task with its monster's name under it. A task
 * that asked for care has no monster and is not listed.
 */
export function RecordDaySheet({ open, row, language, onClose }: RecordDaySheetProps) {
  const t = useT();
  const { palette } = useScreenStyle();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      testID="record-day"
      header={
        <View style={styles.head}>
          <View style={styles.title}>
            <SessionText face="action" color={palette.ink} accessibilityRole="header">
              {row ? weekdayName(language, row.position, 'long') : ''}
            </SessionText>
            <SessionText face="caption" color={palette.muted}>
              {row
                ? t('record.day.brought', { instrument: instrumentName(row.instrument, t) })
                : ''}
            </SessionText>
          </View>
          <PressSpring
            accessibilityRole="button"
            accessibilityLabel={t('keep.close')}
            accessibilityHint={t('keep.close.hint')}
            onPress={onClose}
            hitSlop={8}
            testID="record-day-close"
            style={[styles.close, { backgroundColor: `${palette.ink}0F` }]}
          >
            <CloseIcon color={palette.ink} />
          </PressSpring>
        </View>
      }
    >
      <SheetScroll style={styles.list}>
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          {(row?.caught ?? []).map((one, index, all) => (
            <View
              key={one.id}
              accessible
              testID={`record-day-thing-${index}`}
              style={[
                styles.row,
                index < all.length - 1 && {
                  borderBottomColor: `${palette.ink}1A`,
                  borderBottomWidth: 0.5,
                },
              ]}
            >
              <SessionText face="action" color={palette.ink} style={styles.thing}>
                {one.taskText ?? one.name}
              </SessionText>
              {one.taskText ? (
                <SessionText face="caption" color={palette.muted}>
                  {one.name}
                </SessionText>
              ) : null}
            </View>
          ))}
        </View>
      </SheetScroll>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 4 },
  title: { flex: 1, gap: 2 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flexGrow: 0, flexShrink: 1 },
  card: { borderRadius: 22, overflow: 'hidden' },
  row: { paddingHorizontal: 16, paddingVertical: 12, gap: 2 },
  thing: { fontSize: 16, lineHeight: 16 * 1.25 },
});
