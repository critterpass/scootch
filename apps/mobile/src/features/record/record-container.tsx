import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';

import { isoWeekOf } from '@scootch/domain';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { usePlus, type Keepsakes } from '../../state/keepsakes';
import { useScreenStyle } from '../../ui/use-screen-style';
import { useKeptWeeks } from '../plus/kept-records';
import { PLUS_RECORDS, PLUS_SHEET } from '../plus/routes';
import { nativeShareDevice } from '../share/native-share-device';
import { shareWeekClip } from '../share/share-flow';
import { shareOffered } from '../share/share-rules';
import { useShare } from '../share/use-share';

import { nativePcmPlayer } from './native-pcm-player';
import { weekClip, weekTrack } from './record-audio';
import { RecordPane } from './record-pane';
import { weekShareOffered, weekView } from './record-week';
import { useRecordPlayback } from './use-record-playback';

export interface RecordTabProps {
  readonly keepsakes: Keepsakes;
  /** Whether the record is the tab in view. Out of view it does not play. */
  readonly active: boolean;
}

/** This week's record on the real phone, as a tab. */
export function RecordTab({ keepsakes, active }: RecordTabProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { reducedMotion } = useScreenStyle();
  const { localDate, settings, heavyToday, today } = useToday();
  const t = useT();
  const plus = usePlus();
  const shelf = useKeptWeeks();
  const player = useMemo(() => nativePcmPlayer(), []);
  const week = useMemo(() => {
    const { week: thisWeek, weekday } = isoWeekOf(localDate);
    return weekView({
      week: thisWeek,
      bars: keepsakes.bars,
      monsters: keepsakes.monsters,
      tasks: keepsakes.tasks,
      weekRecords: keepsakes.weekRecords,
      todayPosition: weekday,
    });
  }, [keepsakes, localDate]);
  const { toggle, ...playback } = useRecordPlayback(week.week, week.rows, player, settings.music);
  // The record plays for whoever is looking at it: another tab, or home, lifts the needle.
  const { playing } = playback;
  useEffect(() => {
    if (!active && playing) toggle();
  }, [active, playing, toggle]);

  const plusDoor = {
    openPlus: () => router.push(PLUS_SHEET),
  };
  // Nothing sells near something heavy: on such a day the locked control does nothing, here and
  // on the composer this record opens.
  const door: { readonly openPlus?: () => void } = { ...(heavyToday ? {} : plusDoor) };
  const share = useShare(today, door.openPlus);
  return (
    <RecordPane
      active={active}
      model={{
        week,
        language,
        plus,
        playback,
        reducedMotion,
        kept: shelf.weeks.includes(week.week),
        keptCount: shelf.weeks.length,
      }}
      actions={{
        togglePlay: toggle,
        ...door,
        // The entitlement decides again here, whatever the chip drew.
        keep: () => {
          if (plus) shelf.keep(week.week);
        },
        openShelf: () => router.push(PLUS_RECORDS),
        shareWeek: () => {
          if (!weekShareOffered(week)) return;
          share.open({
            kind: 'song',
            sleeve: {
              weekNumber: week.weekNumber,
              week: week.week,
              name: week.name,
              // A day's task is credited only when it may be shared; its instrument always is.
              credits: week.rows.map((row) => {
                const task = row.monster ? (keepsakes.tasks.get(row.monster.taskId) ?? null) : null;
                return {
                  position: row.position,
                  instrument: t(`record.instrument.${row.instrument}`),
                  task: task && shareOffered(task) ? task.text.slice(0, 80) : null,
                };
              }),
            },
            // The clip still goes out as an audio file by itself, from the composer.
            sound: () =>
              void shareWeekClip(
                nativeShareDevice,
                weekClip(weekTrack(week.rows)),
                week.week,
              ).catch(() => undefined),
          });
        },
      }}
    />
  );
}
