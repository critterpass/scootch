import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { isoWeekOf } from '@scootch/domain';

import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes, usePlus } from '../../state/keepsakes';
import { useScreenStyle } from '../../ui/use-screen-style';
import { useKeptWeeks } from '../plus/kept-records';
import { PLUS_RECORDS, PLUS_SHEET } from '../plus/routes';
import { nativeShareDevice } from '../share/native-share-device';
import { shareWeekClip } from '../share/share-flow';

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
  const { localDate, settings, heavyToday } = useToday();
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
        close: () => router.dismissTo('/world'),
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
          // The clip goes out as an audio file by itself: whether it becomes a video is undecided.
          void shareWeekClip(nativeShareDevice, weekClip(weekTrack(week.rows)), week.week).catch(
            () => undefined,
          );
        },
      }}
    />
  );
}
