import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useT } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes } from '../../state/keepsakes';
import { nativePcmPlayer } from '../record/native-pcm-player';
import { weekView } from '../record/record-week';
import { useRecordPlayback } from '../record/use-record-playback';

import { useKeptWeeks } from './kept-records';
import { RecordShelf } from './record-shelf';

/**
 * The record shelf on the real phone: the kept weeks, newest first, each with the bars the
 * phone's own tables hold for it. One record plays at a time; a tap on another lifts the needle
 * off the first, and leaving the shelf stops whatever is playing.
 */
export function RecordShelfContainer() {
  const router = useRouter();
  const t = useT();
  const { settings } = useToday();
  const { weeks } = useKeptWeeks();
  const { keepsakes } = useKeepsakes();
  const player = useMemo(() => nativePcmPlayer(), []);

  const kept = useMemo(
    () =>
      [...weeks].reverse().map((week) =>
        weekView({
          week,
          bars: keepsakes?.bars ?? [],
          monsters: keepsakes?.monsters ?? [],
          tasks: keepsakes?.tasks ?? new Map(),
          weekRecords: keepsakes?.weekRecords ?? [],
          // A kept week is over, or is this one as it stood: no day of it is waited for here.
          todayPosition: null,
        }),
      ),
    [weeks, keepsakes],
  );

  // The record that is out of its sleeve. It plays once the shelf has drawn it there.
  const [out, setOut] = useState<string | null>(null);
  const chosen = kept.find((one) => one.week === out) ?? null;
  const { playing, toggle } = useRecordPlayback(
    chosen?.week ?? '',
    chosen?.rows ?? [],
    player,
    settings.music,
  );
  const starts = useRef(false);
  const press = useRef(toggle);
  press.current = toggle;
  useEffect(() => {
    if (!starts.current || out === null) return;
    starts.current = false;
    press.current();
  }, [out]);

  return (
    <RecordShelf
      records={kept.map((one) => ({
        week: one.week,
        weekNumber: one.weekNumber,
        name: one.name ?? t('record.week', { number: one.weekNumber }),
        bars: one.barCount,
        cover: one.rows.flatMap((row) => (row.monster ? [row.monster.spec] : [])),
      }))}
      playing={playing ? out : null}
      onPlay={(week) => {
        if (week === out) return toggle();
        // Another record: the needle comes off the one that is playing first.
        if (playing) toggle();
        starts.current = true;
        setOut(week);
      }}
      close={() => router.dismissTo('/record')}
    />
  );
}
