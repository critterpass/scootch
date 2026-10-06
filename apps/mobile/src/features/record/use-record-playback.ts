import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { durationSeconds, type RecordInstrument, type Track } from '@scootch/sound';

import { armAngle, litInstruments, NEEDLE_DROP_MS, trackKey, weekTrack } from './record-audio';
import type { PcmPlayer } from './pcm-player';
import type { RecordRow } from './record-week';

export interface RecordPlayback {
  readonly playing: boolean;
  /** The instruments whose rows are lit just now. */
  readonly lit: readonly RecordInstrument[];
  /** How far through the track it is, 0 to 1. */
  readonly progress: number;
  readonly armDeg: number;
  readonly toggle: () => void;
}

const TICK_MS = 100;

/**
 * Plays a week's track and follows it: which rows are lit, how far the arm has travelled. The
 * track is composed on the first press, not before, since composing is real work.
 */
export function useRecordPlayback(
  week: string,
  rows: readonly RecordRow[],
  player: PcmPlayer,
  musicOn: boolean,
): RecordPlayback {
  const [seconds, setSeconds] = useState<number | null>(null);
  const track = useRef<{ key: string; track: Track } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const key = useMemo(() => trackKey(week, rows), [week, rows]);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    player.stop();
    setSeconds(null);
  }, [player]);

  useEffect(() => stop, [stop]);

  const play = useCallback(() => {
    if (rows.length === 0) return;
    setSeconds(0);
    // Let the pressed control draw before the track is composed.
    setTimeout(() => {
      if (track.current?.key !== key) track.current = { key, track: weekTrack(rows) };
      const composed = track.current.track;
      if (musicOn) player.play(key, () => composed);
      const startedAt = Date.now() + NEEDLE_DROP_MS;
      const total = durationSeconds(composed);
      timer.current = setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000;
        if (elapsed >= total) stop();
        else setSeconds(Math.max(0, elapsed));
      }, TICK_MS);
    }, 0);
  }, [key, rows, player, musicOn, stop]);

  const composed = track.current?.key === key ? track.current.track : null;
  const total = composed ? durationSeconds(composed) : 0;
  const playing = seconds !== null;
  return {
    playing,
    lit: playing && composed ? litInstruments(composed, seconds) : [],
    progress: playing && total > 0 ? Math.min(1, seconds / total) : 0,
    armDeg: armAngle(seconds ?? 0, total),
    toggle: playing ? stop : play,
  };
}
