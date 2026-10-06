import { StyleSheet, View } from 'react-native';

import type { RecordInstrument } from '@scootch/sound';

import type { Translate } from '../../../i18n/i18n-provider';
import { useScreenStyle } from '../../../ui/use-screen-style';

/** An instrument's name in the interface language. */
export function instrumentName(instrument: RecordInstrument, t: Translate): string {
  return t(`record.instrument.${instrument}`);
}

/** "2 of 7 bars · keys, bassline", or the full band's own line. */
export function bandLine(instruments: readonly RecordInstrument[], t: Translate): string {
  if (instruments.length === 7) return t('record.fullBand');
  const names = instruments.map((one) => instrumentName(one, t).toLowerCase()).join(', ');
  return `${t('record.barsOfSeven', { count: instruments.length })} · ${names}`;
}

/**
 * The strip under the record: one segment for each bar the week has, and an outline for each it
 * could still have. It counts what is there; it never marks which day is not.
 */
export function BarStrip({ barCount, progress }: { barCount: number; progress: number }) {
  const { palette } = useScreenStyle();
  return (
    <View style={styles.strip} accessible={false} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: 7 }, (_, index) => {
        const earned = index < barCount;
        const played = earned ? Math.min(1, Math.max(0, progress * barCount - index)) : 0;
        return (
          <View
            key={index}
            style={[
              styles.segment,
              earned
                ? { backgroundColor: `${palette.ink}1F` }
                : { borderWidth: 1, borderColor: `${palette.ink}1F` },
            ]}
          >
            <View
              style={[
                styles.played,
                { width: `${played * 100}%`, backgroundColor: palette.tomato },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 4, alignSelf: 'stretch' },
  segment: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  played: { height: 5, borderRadius: 3 },
});
