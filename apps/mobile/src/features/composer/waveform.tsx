import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@scootch/tokens';

const BARS = 22;
const TALLEST = 30;
const SHORTEST = 3;
const FRAME_MS = 80;
/** The still shape shown when motion is reduced: a calm swell towards the middle. */
const STILL_LEVEL = 0.5;

/** One bar's height: the voice's level, shaped so the middle bars stand tallest. */
export function barHeight(index: number, level: number, seconds: number): number {
  const swell = 1 - Math.abs(index - (BARS - 1) / 2) / 16;
  const ripple = 0.35 + 0.65 * Math.abs(Math.sin(seconds * 7 + index * 0.55));
  return Math.max(SHORTEST, level * ripple * swell * TALLEST);
}

/** `0:14` for a recording that has run fourteen seconds. */
export function recordingTime(elapsedMs: number): string {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export interface WaveformProps {
  /** The voice's level, from 0 to 1. */
  readonly level: number;
  readonly startedAt: number;
  /** False under Reduce Motion: the bars hold one still shape and only the time changes. */
  readonly moving: boolean;
  readonly color: string;
  readonly allowFontScaling: boolean;
  readonly fontSize: number;
}

/** The live waveform and the running time inside the capsule while it listens. */
export function Waveform({
  level,
  startedAt,
  moving,
  color,
  allowFontScaling,
  fontSize,
}: WaveformProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), moving ? FRAME_MS : 500);
    return () => clearInterval(timer);
  }, [moving]);

  const elapsed = Math.max(0, now - startedAt);
  return (
    <View style={styles.row}>
      <View style={styles.bars}>
        {Array.from({ length: BARS }, (_, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                backgroundColor: color,
                height: moving
                  ? barHeight(index, Math.max(level, 0.12), elapsed / 1000)
                  : barHeight(index, STILL_LEVEL, 0),
              },
            ]}
          />
        ))}
      </View>
      <Text allowFontScaling={allowFontScaling} style={[styles.time, { color, fontSize }]}>
        {recordingTime(elapsed)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  bars: {
    flex: 1,
    height: TALLEST,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
  time: {
    fontFamily: fonts.heading,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
