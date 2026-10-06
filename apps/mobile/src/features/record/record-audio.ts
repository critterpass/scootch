import {
  clip,
  composeBar,
  composeWeek,
  renderBar,
  type FinishedDay,
  type RecordInstrument,
  type Stereo,
  type Track,
} from '@scootch/sound';

import type { RecordRow } from './record-week';

/** The shareable clip of a week is this long. */
export const CLIP_SECONDS = 15;

const dayOf = (row: Pick<RecordRow, 'position' | 'seed'>): FinishedDay => ({
  weekday: row.position - 1,
  seed: row.seed,
});

/** The week's track from the bars it has. Fewer bars are a smaller band, and it still plays. */
export function weekTrack(rows: readonly Pick<RecordRow, 'position' | 'seed'>[]): Track {
  return composeWeek(rows.map(dayOf));
}

/** One day's bar on its own, as it sounds the day it is earned. */
export function barSound(row: Pick<RecordRow, 'position' | 'seed'>): Stereo {
  return renderBar(composeBar(dayOf(row)));
}

export function weekClip(track: Stereo): Stereo {
  return clip(track, CLIP_SECONDS);
}

/** A name for the audio of these bars that changes whenever the bars do. */
export function trackKey(
  week: string,
  rows: readonly Pick<RecordRow, 'position' | 'seed'>[],
): string {
  return `${week}-${rows.map((row) => `${row.position}${row.seed}`).join('')}`.replace(
    /[^A-Za-z0-9-]/g,
    '',
  );
}

// The record's motion, as the design board plays it.
/** The needle is down and the sound starts this long after play is pressed. */
export const NEEDLE_DROP_MS = 250;
/** One turn of the record at full speed, and how long it takes to reach it and to lose it. */
export const SPIN_TURN_MS = 1800;
export const SPIN_UP_MS = 700;
export const SPIN_DOWN_MS = 1100;
/** The arm: at rest, where it drops, how far it travels across the track, and its swing. */
export const ARM_REST_DEG = -18;
export const ARM_DROP_DEG = 4;
export const ARM_TRAVEL_DEG = 16;
export const ARM_SWING_MS = 900;

/** The arm's angle `seconds` into a track `total` seconds long. */
export function armAngle(seconds: number, total: number): number {
  const along = total <= 0 ? 0 : Math.min(1, Math.max(0, seconds / total));
  return ARM_DROP_DEG + along * ARM_TRAVEL_DEG;
}

/**
 * The instruments whose rows are lit `seconds` into the track: the one joining while the band
 * builds, and everyone once it plays together.
 */
export function litInstruments(
  track: Pick<Track, 'sections'>,
  seconds: number,
): readonly RecordInstrument[] {
  const section = track.sections.findLast((one) => one.startSeconds <= seconds);
  if (!section) return [];
  if (section.kind !== 'entrance') return section.instruments;
  const joining = section.instruments.at(-1);
  return joining ? [joining] : [];
}
