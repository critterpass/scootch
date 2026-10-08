import { getCalendars } from 'expo-localization';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import type { Instant } from '@scootch/domain';
import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

import { endsAtClock } from './task-set-helpers';

const SIZE = 15;
/** How often the clock is read again: the line is never more than this behind the minute. */
const READ_EVERY_MS = 10_000;

export interface EndsAtLineProps {
  readonly minutes: number;
  /** The time the line is worked out from, held still: a capture's. Unset, the phone's clock. */
  readonly now?: Instant;
}

/**
 * "Ends at 3:42": when the chosen length would be over if it were started now, in the quiet grey
 * under the wheel. It follows the wheel and the clock, and is read out with the length.
 */
export function EndsAtLine({ minutes, now: held }: EndsAtLineProps) {
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
  return (
    <Text
      testID="task-set-ends-at"
      accessibilityLabel={t('taskSet.endsAt.spoken', { minutes, clock })}
      accessibilityLiveRegion="polite"
      allowFontScaling={allowFontScaling}
      style={[
        styles.line,
        { color: palette.muted, fontSize: size(SIZE), lineHeight: size(SIZE) * 1.3 },
      ]}
    >
      {t('taskSet.endsAt', { clock })}
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
