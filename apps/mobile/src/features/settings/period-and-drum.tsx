import { StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n/i18n-provider';
import { PERIOD_LENGTHS } from '../../state/board-core';
import { useBoard, useBoardStore } from '../../state/board-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

import { Segments, SwitchRow } from './settings-parts';

/** His note beside each period length, as the Settings board writes it. */
const PERIOD_NOTES: Readonly<
  Record<number, 'settings.period.note.10' | 'settings.period.note.15' | 'settings.period.note.25'>
> = { 10: 'settings.period.note.10', 15: 'settings.period.note.15', 25: 'settings.period.note.25' };

/**
 * The class's first rows: how long a period lasts (ten minutes unless changed; a pop quiz is still
 * fifteen), and the school drum at the start and end. Both are kept by the board store.
 */
export function PeriodAndDrum() {
  const t = useT();
  const board = useBoard();
  const store = useBoardStore();
  const { palette, allowFontScaling, size, captured } = useScreenStyle();
  return (
    <>
      <View style={styles.cell} testID="settings-period">
        <View style={styles.head}>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.label, { color: palette.ink, fontSize: size(16) }]}
          >
            {t('settings.period')}
          </Text>
          <Text
            allowFontScaling={allowFontScaling}
            style={{ color: palette.muted, fontSize: size(14) }}
          >
            {t(PERIOD_NOTES[board.periodLength] ?? 'settings.period.note.10')}
          </Text>
        </View>
        <Segments
          label={t('settings.period')}
          value={String(board.periodLength)}
          options={PERIOD_LENGTHS.map((minutes) => ({
            value: String(minutes),
            label: String(minutes),
            spoken: t('settings.period.minutes', { minutes }),
          }))}
          onChange={(next) => {
            if (!captured) void store.setPeriodLength(Number(next));
          }}
        />
      </View>
      <SwitchRow
        label={t('settings.drum')}
        value={board.drum}
        onChange={(on) => {
          if (!captured) void store.setDrum(on);
        }}
        testID="settings-drum"
      />
    </>
  );
}

const styles = StyleSheet.create({
  cell: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  head: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    columnGap: 10,
  },
  label: { flexShrink: 1 },
});
