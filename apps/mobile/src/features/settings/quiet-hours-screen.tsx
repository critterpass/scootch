import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n/i18n-provider';
import { PageHeader } from '../../ui/page-header';
import { useScreenStyle } from '../../ui/use-screen-style';
import { DEFAULT_QUIET, type QuietHours } from '../notes/notes-plan';
import { readNotesSettings, writeNotesSettings } from '../notes/notes-settings';

import { ClockPicker } from './clock-picker';
import { Foot, Group, Rule, usePage } from './settings-parts';

/** One cell of the group: what the time is for, and the time at its end. */
function TimeRow({
  label,
  minute,
  onChange,
  first,
  testID,
}: {
  readonly label: string;
  readonly minute: number;
  readonly onChange: (next: number) => void;
  readonly first: boolean;
  readonly testID: string;
}) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  return (
    <View style={[styles.cell, largeText && styles.cellStacked]}>
      {first ? null : <Rule />}
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.label, { color: palette.ink, fontSize: size(16) }]}
      >
        {label}
      </Text>
      <ClockPicker label={label} minute={minute} onChange={onChange} testID={testID} />
    </View>
  );
}

/**
 * Quiet hours: when no note comes home. Sleep and Focus are the system's, and always respected.
 * A change is kept as it is made, so the way back is the system's back.
 */
export function QuietHoursScreen() {
  const t = useT();
  const db = useSQLiteContext();
  const page = usePage();
  const [quiet, setQuiet] = useState<QuietHours>(DEFAULT_QUIET);

  useEffect(() => {
    let current = true;
    void readNotesSettings(db).then((stored) => {
      if (current) setQuiet(stored.quiet);
    });
    return () => {
      current = false;
    };
  }, [db]);

  const change = (next: QuietHours) => {
    setQuiet(next);
    void writeNotesSettings(db, { quiet: next });
  };

  return (
    <>
      <ScrollView
        style={{ backgroundColor: page }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        testID="settings-quiet"
      >
        <Group>
          <TimeRow
            first
            label={t('settings.quiet.from')}
            minute={quiet.from}
            onChange={(from) => change({ ...quiet, from })}
            testID="quiet-from"
          />
          <TimeRow
            first={false}
            label={t('settings.quiet.to')}
            minute={quiet.to}
            onChange={(to) => change({ ...quiet, to })}
            testID="quiet-to"
          />
        </Group>
        <Foot>{t('settings.quiet.foot')}</Foot>
      </ScrollView>
      <PageHeader title={t('settings.notes.quiet')} />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 24 },
  cell: {
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cellStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 6 },
  label: { flexShrink: 1, flexGrow: 1 },
});
