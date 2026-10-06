import { createMix, finishMix } from '../core/mix';
import { SAMPLE_RATE, type Stereo } from '../core/signal';

import { BAR_SECONDS, type Chord, CHORDS, ENDING_SECONDS, playBar, playEnding } from './band';
import { type Bar, composeBar, type FinishedDay, type RecordInstrument } from './bar';

export interface TrackSection {
  /** `entrance`: a day's instrument joins. `together`: the whole band. `ending`: the last chord. */
  readonly kind: 'entrance' | 'together' | 'ending';
  readonly startSeconds: number;
  /** Who is playing in this section. */
  readonly instruments: readonly RecordInstrument[];
}

/** The week's record: finished stereo audio, with the bars it was made from and where each section starts. */
export interface Track extends Stereo {
  readonly bars: readonly Bar[];
  readonly sections: readonly TrackSection[];
}

const { one, four, five, six } = CHORDS;

/** Chords for the bars where the instruments enter, by band size. Each leads home to the last chord. */
const ENTRANCES: readonly (readonly Chord[])[] = [
  [],
  [one],
  [one, five],
  [one, six, four],
  [one, five, six, four],
  [one, five, six, four, five],
  [one, five, six, four, one, five],
  [one, five, six, four, one, five, four],
];
/** Chords for the bars the whole band plays together: longer for a bigger band. */
const TOGETHER: readonly (readonly Chord[])[] = [
  [],
  [four],
  [four],
  [one, five],
  [one, five],
  [one, five, six, four],
  [one, five, six, four],
  [one, five, six, four],
];

const ROOM_TAIL_SECONDS = 2.6;
/** A full band sits at -18 LUFS; each missing day makes the record a little quieter as well as shorter. */
const FULL_BAND_LOUDNESS = -18;
const LOUDNESS_PER_MISSING_DAY = 4 / 7;

function render(
  bars: readonly Bar[],
  sections: readonly TrackSection[],
  chords: readonly Chord[],
): Stereo {
  const last = sections.at(-1);
  if (!last)
    return { sampleRate: SAMPLE_RATE, left: new Float32Array(0), right: new Float32Array(0) };
  const mix = createMix(last.startSeconds + ENDING_SECONDS + ROOM_TAIL_SECONDS);
  sections.forEach((section, i) => {
    if (section.kind === 'ending') {
      playEnding(mix, section.instruments, section.startSeconds);
      return;
    }
    for (const bar of bars) {
      if (section.instruments.includes(bar.instrument)) {
        playBar(mix, bar, chords[i] ?? one, section.startSeconds);
      }
    }
  });
  return finishMix(mix, {
    loudness: FULL_BAND_LOUDNESS - (7 - bars.length) * LOUDNESS_PER_MISSING_DAY,
  });
}

/**
 * The week's track from its finished days. Each day's instrument enters in turn, one bar apart, in
 * weekday order; then the whole band plays together and lands on a final chord. Fewer finished days
 * make a shorter track for a smaller band, which still builds, plays together and ends. A weekday
 * given twice counts once (the first). No finished days gives an empty track.
 */
export function composeWeek(days: readonly FinishedDay[]): Track {
  const byWeekday = new Map<number, Bar>();
  for (const day of days) {
    const bar = composeBar(day);
    if (!byWeekday.has(bar.weekday)) byWeekday.set(bar.weekday, bar);
  }
  const bars = [...byWeekday.values()].sort((a, b) => a.weekday - b.weekday);
  const band = bars.map((bar) => bar.instrument);
  const entrances = ENTRANCES[bars.length] ?? [];
  const together = TOGETHER[bars.length] ?? [];
  const chords = [...entrances, ...together];
  const sections: TrackSection[] = chords.map((_, i) => ({
    kind: i < entrances.length ? 'entrance' : 'together',
    startSeconds: i * BAR_SECONDS,
    instruments: i < entrances.length ? band.slice(0, i + 1) : band,
  }));
  if (bars.length > 0) {
    sections.push({ kind: 'ending', startSeconds: chords.length * BAR_SECONDS, instruments: band });
  }
  return { ...render(bars, sections, chords), bars, sections };
}

/** One day's bar on its own, as it sounds the day it is earned: the bar over the home chord, then the last chord. */
export function renderBar(bar: Bar): Stereo {
  const mix = createMix(BAR_SECONDS + ENDING_SECONDS + ROOM_TAIL_SECONDS);
  playBar(mix, bar, one, 0);
  playEnding(mix, [bar.instrument], BAR_SECONDS);
  return finishMix(mix, { loudness: FULL_BAND_LOUDNESS - 6 * LOUDNESS_PER_MISSING_DAY });
}
