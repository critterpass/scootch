import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';

import { ink } from './class-style';

/** The lengths a period may be given from the desk, in minutes. */
export const PERIOD_LENGTHS = [5, 10, 15, 25, 45] as const;

/** Held, Start offers the period's length: a row of chips above it, the current one dark. */
export function PeriodLengths({
  minutes,
  onPick,
}: {
  readonly minutes: number;
  readonly onPick: (minutes: number) => void;
}) {
  const t = useT();
  const sizing = useTextSizing();
  return (
    <View
      style={styles.lengths}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('desk.periodLength')}
    >
      {PERIOD_LENGTHS.map((length) => (
        <Pressable
          key={length}
          accessibilityRole="radio"
          accessibilityState={{ selected: length === minutes }}
          accessibilityLabel={t('desk.startMinutes', { minutes: length })}
          onPress={() => onPick(length)}
          style={[
            styles.chip,
            { backgroundColor: length === minutes ? ink.text : 'rgba(28,26,24,0.06)' },
          ]}
        >
          <Text
            allowFontScaling={sizing.allowFontScaling}
            style={[styles.chipText, { color: length === minutes ? ink.white : ink.text }]}
          >
            {length}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lengths: {
    position: 'absolute',
    right: -4,
    bottom: 66,
    flexDirection: 'row',
    gap: 4,
    padding: 5,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.92)',
    boxShadow: '0 8px 24px rgba(60,40,20,0.10)',
    zIndex: 2,
  },
  chip: {
    minWidth: 46,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
