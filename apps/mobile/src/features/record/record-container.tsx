import { usePreventRemove, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { isoWeekOf } from '@scootch/domain';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes, usePlus } from '../../state/keepsakes';
import { goBack } from '../../ui/motion/go-back';
import { useScreenStyle } from '../../ui/use-screen-style';
import { useKeptWeeks } from '../plus/kept-records';
import { PLUS_RECORDS, PLUS_SHEET } from '../plus/routes';
import { nativeShareDevice } from '../share/native-share-device';
import { shareWeekClip } from '../share/share-flow';
import { SharePanel } from '../share/share-panel';
import { shareOffered } from '../share/share-rules';
import { useShare } from '../share/use-share';

import { nativePcmPlayer } from './native-pcm-player';
import { weekClip, weekTrack } from './record-audio';
import { RecordScreen } from './record-screen';
import { weekShareOffered, weekView } from './record-week';
import { useRecordPlayback } from './use-record-playback';

/** This week's record on the real phone. */
export function RecordContainer() {
  const router = useRouter();
  const { language } = useLanguage();
  const { palette, reducedMotion } = useScreenStyle();
  const { localDate, settings, heavyToday, today } = useToday();
  const t = useT();
  const share = useShare(language, today);
  // The composer is drawn over the record, not pushed: a swipe back closes it first.
  const { panel } = share;
  usePreventRemove(panel !== null, () => panel?.actions.close());
  const { keepsakes } = useKeepsakes();
  const plus = usePlus();
  const shelf = useKeptWeeks();
  const player = useMemo(() => nativePcmPlayer(), []);
  const week = useMemo(() => {
    const { week: thisWeek, weekday } = isoWeekOf(localDate);
    return weekView({
      week: thisWeek,
      bars: keepsakes?.bars ?? [],
      monsters: keepsakes?.monsters ?? [],
      tasks: keepsakes?.tasks ?? new Map(),
      weekRecords: keepsakes?.weekRecords ?? [],
      todayPosition: weekday,
    });
  }, [keepsakes, localDate]);
  const { toggle, ...playback } = useRecordPlayback(week.week, week.rows, player, settings.music);

  const plusDoor = {
    openPlus: () => router.push(PLUS_SHEET),
  };
  if (!keepsakes) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  if (panel) return <SharePanel {...panel} />;
  return (
    <RecordScreen
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
        // Back to the world it was opened from, whether that is a page beside home or a screen.
        close: () => goBack(router, '/world'),
        togglePlay: toggle,
        // Nothing sells near something heavy: on such a day the locked control does nothing.
        ...(heavyToday ? {} : plusDoor),
        // The entitlement decides again here, whatever the dock drew.
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
                const task = row.monster
                  ? (keepsakes?.tasks.get(row.monster.taskId) ?? null)
                  : null;
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
