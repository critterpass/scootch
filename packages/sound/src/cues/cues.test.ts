import { describe, expect, it } from 'vitest';

import { integratedLufs } from '../core/loudness';
import { durationSeconds, peak, rmsDb, toMono } from '../core/signal';
import { dominantFrequency, spectralCentroid } from '../core/spectrum';
import { CUE_LOUDNESS_BAND } from '../cue';
import { CUES } from '../cue-list';

import { holdRisingAt } from './hold-rising';

const NAMES = [
  'finish',
  'hatch',
  'hold-rising',
  'nudge',
  'park-a-thought',
  'quiet-finish',
  'shrink',
  'squeak',
  'start-burst',
  'two-minutes-left',
];

describe('cues', { timeout: 60_000 }, () => {
  it('lists every named cue', () => {
    expect(Object.keys(CUES).sort()).toEqual(NAMES);
  });

  it.each(NAMES)('%s renders the same audible, unclipped sound every time', (name) => {
    const cue = CUES[name];
    if (!cue) throw new Error(`missing cue ${name}`);
    const audio = cue.render();
    const again = cue.render();
    expect(again.left).toEqual(audio.left);
    expect(again.right).toEqual(audio.right);

    expect(audio.sampleRate).toBe(44100);
    expect(durationSeconds(audio)).toBeGreaterThan(0.3);
    expect(durationSeconds(audio)).toBeLessThan(4.5);
    expect(rmsDb(audio, 0, 0.5)).toBeGreaterThan(-45);
    expect(peak(audio)).toBeLessThanOrEqual(0.9);
    expect(audio.left.every(Number.isFinite) && audio.right.every(Number.isFinite)).toBe(true);
    // It ends in silence, not a cut-off.
    expect(rmsDb(audio, durationSeconds(audio) - 0.01)).toBeLessThan(-60);

    const loudness = integratedLufs(audio);
    expect(loudness).toBeGreaterThanOrEqual(CUE_LOUDNESS_BAND.min);
    expect(loudness).toBeLessThanOrEqual(CUE_LOUDNESS_BAND.max);
    expect(loudness).toBeLessThanOrEqual(cue.loudness + 0.1);
  });

  it.each(NAMES)('%s declares haptics that fit inside its sound', (name) => {
    const cue = CUES[name];
    if (!cue) throw new Error(`missing cue ${name}`);
    const lengthMs = durationSeconds(cue.render()) * 1000;
    expect(cue.haptics.length).toBeGreaterThan(0);
    cue.haptics.forEach((tap, i) => {
      expect(tap.atMs).toBeGreaterThanOrEqual(cue.haptics[i - 1]?.atMs ?? 0);
      expect(tap.atMs + tap.durationMs).toBeLessThan(lengthMs);
      for (const value of [tap.intensity, tap.sharpness]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });

  it('keeps the quiet finish well under the finish, with no drum hit', () => {
    const finish = CUES['finish']?.render();
    const quiet = CUES['quiet-finish']?.render();
    if (!finish || !quiet) throw new Error('missing finish cues');
    expect(integratedLufs(quiet)).toBeLessThan(integratedLufs(finish) - 6);
    expect(peak(quiet)).toBeLessThan(peak(finish) / 2);
  });

  it('raises the pitch and the level of the hold as progress grows', () => {
    const early = holdRisingAt(0.1);
    const late = holdRisingAt(0.9);
    const pitch = (audio: typeof early) => dominantFrequency(toMono(audio), audio.sampleRate, 150);
    expect(pitch(late)).toBeGreaterThan(pitch(early) * 2);
    expect(spectralCentroid(toMono(late), late.sampleRate)).toBeGreaterThan(
      spectralCentroid(toMono(early), early.sampleRate),
    );
    expect(integratedLufs(late)).toBeGreaterThan(integratedLufs(early));
    expect(holdRisingAt(0.9).left).toEqual(late.left);
  });

  it('ends a full hold with a pop louder than the hold before it', () => {
    const pop = holdRisingAt(1);
    expect(peak(pop)).toBeGreaterThan(peak(holdRisingAt(0.9)));
    expect(peak(pop)).toBeLessThanOrEqual(0.9);
  });
});
