import { applyBiquad, biquadCoeffs } from '../core/filter';
import { normalise } from '../core/loudness';
import { createMix, finishMix, type Mix, PEAK_CEILING, place } from '../core/mix';
import { whiteNoise } from '../core/noise';
import { waveAt } from '../core/oscillator';
import { peak, scaled, type Stereo } from '../core/signal';
import { type Cue, type HapticTap, tap } from '../cue';
import { noiseHit, shaker, thump } from '../instruments/percussion';
import { note, noteHz } from '../instruments/scale';
import { bell, marimba } from '../instruments/tuned';

const LOUDNESS = -19;
/** How long a full hold takes, and how long one moment of it is rendered for. */
export const HOLD_SECONDS = 1.7;
const MOMENT_SECONDS = 0.6;
const TAIL_SECONDS = 2.5;

type Progress = (t: number) => number;

interface Step {
  readonly at: number;
  readonly progress: number;
  /** Seconds until the next step: the notes come faster as the hold fills. */
  readonly gap: number;
}

/** When each marimba step of a hold lands. */
function holdSteps(progressAt: Progress, seconds: number): Step[] {
  const steps: Step[] = [];
  for (let at = 0.02; at < seconds;) {
    const progress = progressAt(at);
    const gap = 0.3 - progress * 0.22;
    steps.push({ at, progress, gap });
    at += gap;
  }
  return steps;
}

/** The two layers that never stop while holding: a noise swirl that opens up, and a low drone that brightens. */
function sustained(mix: Mix, progressAt: Progress, seconds: number): void {
  const { sampleRate } = mix;
  const length = Math.ceil((seconds + 0.1) * sampleRate);
  const edge = (t: number) =>
    Math.min(1, t / 0.05) * Math.max(0, Math.min(1, (seconds + 0.08 - t) / 0.08));
  const swirl = applyBiquad(
    whiteNoise(length, 7),
    (t) => biquadCoeffs('bandpass', 380 + progressAt(t) * 4200, 1.4, 0, sampleRate),
    sampleRate,
  );
  const drone = new Float32Array(length);
  const low = (2 * Math.PI * noteHz(0)) / 2;
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    drone[i] = waveAt('triangle', low * t) + waveAt('triangle', low * 2 * t);
  }
  const opened = applyBiquad(
    drone,
    (t) => biquadCoeffs('lowpass', 280 + progressAt(t) * 2400, 0.8, 0, sampleRate),
    sampleRate,
  );
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const p = progressAt(t);
    swirl[i] = (swirl[i] ?? 0) * (0.012 + p * p * 0.14) * edge(t);
    opened[i] = (opened[i] ?? 0) * (0.02 + p * 0.06) * edge(t);
  }
  place(mix, swirl, 0, { wet: 0.5 });
  place(mix, opened, 0, { wet: 0.8 });
}

/** The pop when the hold completes: a short thump, a snap and the top note. */
function pop(mix: Mix, at: number): void {
  thump(mix, at, 0.5, 170, 60, 0.18);
  noiseHit(mix, at, { seconds: 0.07, level: 0.16, from: 1800, to: 5200, q: 1, wet: 0.4 });
  marimba(mix, at, note(15), 0.22);
  bell(mix, at + 0.02, note(15), 0.05);
}

function renderHold(progressAt: Progress, seconds: number, withPop: boolean): Stereo {
  const mix = createMix(seconds + TAIL_SECONDS);
  if (seconds > 0) sustained(mix, progressAt, seconds);
  let lastIndex = -1;
  for (const { at, progress, gap } of holdSteps(progressAt, seconds)) {
    const index = Math.min(14, Math.floor(progress * 15));
    marimba(mix, at, note(index), 0.11 + progress * 0.12, index % 2 ? 0.25 : -0.25, 0.35);
    if (index !== lastIndex && index % 5 === 0 && index > 0) bell(mix, at, note(index + 10), 0.035);
    lastIndex = index;
    if (progress > 0.45) shaker(mix, at + gap / 2, 0.025 + progress * 0.03, 0.3);
    if (progress > 0.75) thump(mix, at, 0.12 + progress * 0.1, 90, 50, 0.12);
  }
  if (withPop) pop(mix, seconds);
  return finishMix(mix);
}

/** Progress eases in and out over a full hold, as the button fills. */
const fullHold: Progress = (t) => {
  const p = Math.max(0, Math.min(1, t / HOLD_SECONDS));
  return p * p * (3 - 2 * p);
};

let fullHoldGain: number | undefined;

/** The one gain that sets the full hold to its loudness; moments of a hold share it, so they rise with progress. */
function holdGain(): number {
  if (fullHoldGain === undefined) {
    const raw = renderHold(fullHold, HOLD_SECONDS, true);
    fullHoldGain = peak(normalise(raw, LOUDNESS, PEAK_CEILING)) / peak(raw);
  }
  return fullHoldGain;
}

/**
 * Hold to finish, at one moment of the hold: `progress` runs from 0 (just pressed) to 1 (complete).
 * The notes climb the scale and quicken, the swirl opens and the drum joins near the top. At 1 it is the pop.
 */
export function holdRisingAt(progress: number): Stereo {
  const p = Math.max(0, Math.min(1, progress));
  const raw = p >= 1 ? renderHold(() => 1, 0, true) : renderHold(() => p, MOMENT_SECONDS, false);
  return scaled(raw, holdGain());
}

function holdHaptics(): HapticTap[] {
  const taps = holdSteps(fullHold, HOLD_SECONDS).map(({ at, progress }) =>
    tap(at * 1000, 6 + progress * 18),
  );
  return [...taps, tap(HOLD_SECONDS * 1000, 40)];
}

/** The whole hold from empty to full, ending in the pop. */
export const holdRising: Cue = {
  name: 'hold-rising',
  loudness: LOUDNESS,
  haptics: holdHaptics(),
  render: () => scaled(renderHold(fullHold, HOLD_SECONDS, true), holdGain()),
};
