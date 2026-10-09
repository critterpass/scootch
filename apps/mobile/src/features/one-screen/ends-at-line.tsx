import { getCalendars } from 'expo-localization';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import {
  backAround,
  type ClockTime,
  type DayMoment,
  type Instant,
  type IsoDate,
  type StartCue,
} from '@scootch/domain';
import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

import { endsAtClock } from './task-set-helpers';
import { clockShown, cueInside } from './when-sheet';

const SIZE = 15;
/** How often the clock is read again: the line is never more than this behind the minute. */
const READ_EVERY_MS = 10_000;

export interface EndsAtLineProps {
  readonly minutes: number;
  /** The time the line is worked out from, held still: a capture's. Unset, the phone's clock. */
  readonly now?: Instant;
  /** A cue picked or kept: the line says when the thing comes back instead, while that is ahead. */
  readonly cue?: CueBack | undefined;
  /** A watched time is ahead today: "Ends at 13:40, then you get ready". */
  readonly beforeGetReady?: boolean;
}

/** A cue, and what it needs to be placed on the day. */
export interface CueBack {
  readonly cue: StartCue;
  readonly moments: Readonly<Record<DayMoment, ClockTime>>;
  readonly localDate: IsoDate;
}

/**
 * "Ends at 3:42": when the chosen length would be over if it were started now, in the quiet grey
 * under the wheel. It follows the wheel and the clock, and is read out with the length. With a cue
 * still ahead it says when the thing comes back: "Back after lunch, around 13:10".
 */
export function EndsAtLine({ minutes, now: held, cue, beforeGetReady = false }: EndsAtLineProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  const [read, setRead] = useState(() => Date.now());
  useEffect(() => {
    if (held !== undefined) return undefined;
    const timer = setInterval(() => setRead(Date.now()), READ_EVERY_MS);
    return () => clearInterval(timer);
  }, [held]);
  const timeZone = getCalendars()[0]?.timeZone ?? 'UTC';
  const clock = endsAtClock(held ?? read, minutes, timeZone);
  const back = cue === undefined ? null : backAround({ ...cue, timeZone, now: held ?? read });
  const backLine =
    cue === undefined || back === null || !back.ahead
      ? null
      : cue.cue.kind === 'time'
        ? t('when.back.time', { clock: clockShown(back.clock) })
        : t('when.back', { cue: cueInside(t, cue.cue), clock: clockShown(back.clock) });
  return (
    <Text
      testID="task-set-ends-at"
      accessibilityLabel={
        backLine ??
        t(beforeGetReady ? 'taskSet.endsAtGetReady.spoken' : 'taskSet.endsAt.spoken', {
          minutes,
          clock,
        })
      }
      accessibilityLiveRegion="polite"
      allowFontScaling={allowFontScaling}
      style={[
        styles.line,
        { color: palette.muted, fontSize: size(SIZE), lineHeight: size(SIZE) * 1.3 },
      ]}
    >
      {backLine ?? t(beforeGetReady ? 'taskSet.endsAtGetReady' : 'taskSet.endsAt', { clock })}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {
    fontFamily: fonts.body,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
