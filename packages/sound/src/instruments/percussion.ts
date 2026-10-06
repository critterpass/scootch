import { expGlide, strike } from '../core/envelope';
import { applyBiquad, biquadCoeffs, type BiquadType } from '../core/filter';
import { type Mix, place } from '../core/mix';
import { whiteNoise } from '../core/noise';
import { renderTone } from '../core/oscillator';

export interface NoiseHit {
  readonly seconds: number;
  readonly level: number;
  readonly filter?: BiquadType;
  readonly from?: number;
  /** When set, the filter sweeps from `from` to this frequency over the hit. */
  readonly to?: number;
  readonly q?: number;
  readonly pan?: number;
  readonly wet?: number;
}

/** A burst of filtered noise: the body of whooshes, claps, shakers and mallet clicks. */
export function noiseHit(mix: Mix, at: number, hit: NoiseHit): void {
  const { seconds, level, filter = 'bandpass', from = 2000, to, q = 1, pan = 0, wet = 0.3 } = hit;
  const { sampleRate } = mix;
  const attack = Math.min(0.012, seconds * 0.25);
  const end = attack + seconds;
  mix.noiseCount += 1;
  const raw = whiteNoise(Math.ceil(end * sampleRate), mix.noiseCount);
  const sweep = to === undefined ? undefined : expGlide(from, to, seconds);
  const filtered = applyBiquad(
    raw,
    sweep
      ? (t) => biquadCoeffs(filter, sweep(t), q, 0, sampleRate)
      : biquadCoeffs(filter, from, q, 0, sampleRate),
    sampleRate,
  );
  for (let i = 0; i < filtered.length; i += 1) {
    filtered[i] = (filtered[i] ?? 0) * strike(i / sampleRate, attack, level, end);
  }
  place(mix, filtered, at, { pan, wet });
}

/** A low drum: a sine that drops in pitch as it dies. */
export function thump(
  mix: Mix,
  at: number,
  level = 0.5,
  from = 150,
  to = 46,
  seconds = 0.32,
): void {
  const tone = renderTone(
    {
      wave: 'sine',
      freq: expGlide(from, to, seconds * 0.55),
      attack: 0.003,
      peak: level,
      seconds: 0.003 + seconds,
    },
    mix.sampleRate,
  );
  place(mix, tone, at);
}

/** A hand clap: two short flams and a longer body. */
export function clap(mix: Mix, at: number, level = 0.2): void {
  [0, 0.009, 0.019].forEach((offset, i) => {
    noiseHit(mix, at + offset, {
      seconds: i === 2 ? 0.14 : 0.03,
      level,
      from: 1500,
      q: 1.1,
      wet: 0.6,
    });
  });
}

/** One shake of a shaker. */
export function shaker(mix: Mix, at: number, level = 0.05, pan = 0): void {
  noiseHit(mix, at, {
    seconds: 0.045,
    level,
    filter: 'highpass',
    from: 7500,
    q: 1.08,
    pan,
    wet: 0.15,
  });
}
