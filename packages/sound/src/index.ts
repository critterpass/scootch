// Cues, the daily bar and the record.
export { integratedLufs } from './core/loudness';
export {
  durationSeconds,
  linearToDb,
  peak,
  rmsDb,
  SAMPLE_RATE,
  type Stereo,
  toMono,
} from './core/signal';
export { dominantFrequency, occupiedOctaves, spectralCentroid } from './core/spectrum';
export { encodeWav } from './core/wav';
export { type Cue, CUE_LOUDNESS_BAND, type HapticTap } from './cue';
export { CUES } from './cue-list';
export * from './cues/index.generated';
export {
  type Bar,
  type BarNote,
  composeBar,
  type FinishedDay,
  RECORD_INSTRUMENTS,
  type RecordInstrument,
} from './record/bar';
export { clip } from './record/clip';
export { composeWeek, renderBar, type Track, type TrackSection } from './record/compose-week';
