import { describe, expect, it } from 'vitest';

import { integratedLufs } from '../core/loudness';
import { durationSeconds, peak, rmsDb, toMono } from '../core/signal';
import { dominantFrequency, spectralCentroid } from '../core/spectrum';
import { CUE_LOUDNESS_BAND } from '../cue';
import { CUES } from '../cue-list';
import { noteHz } from '../instruments/scale';

import { HOLD_SECONDS, holdRisingAt, holdRisingFrom } from './hold-rising';

const NAMES = [
  'aww',
  'cancel',
  'catch-cinch',
  'catch-float',
  'catch-fold',
  'catch-landed',
  'catch-peel',
  'catch-pop',
  'catch-seal',
  'catch-slam',
  'catch-slurp',
  'catch-splash',
  'catch-stick',
  'catch-swoosh',
  'catch-unlock',
  'catch-yank',
  'finish',
  'grumble',
  'hatch',
  'hold-rising',
  'listen',
  'nudge',
  'park-a-thought',
  'quiet-finish',
  'send',
  'shrink',
  'squeak',
  'start-burst',
  'tick',
  'two-minutes-left',
];

/** The design's buzz for each small cue: alternating milliseconds on and off. The sigh has none. */
const DESIGNED_BUZZES: readonly (readonly [string, readonly number[]])[] = [
  ['tick', [7]],
  ['listen', [10]],
  ['send', [6, 40, 10]],
  ['cancel', [10]],
  ['grumble', [14]],
  ['aww', []],
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
    if (name !== 'aww') expect(cue.haptics.length).toBeGreaterThan(0);
    cue.haptics.forEach((tap, i) => {
      expect(tap.atMs).toBeGreaterThanOrEqual(cue.haptics[i - 1]?.atMs ?? 0);
      expect(tap.atMs + tap.durationMs).toBeLessThan(lengthMs);
      for (const value of [tap.intensity, tap.sharpness]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });

  it.each(DESIGNED_BUZZES)('%s buzzes as designed', (name, buzzes) => {
    const taps = CUES[name]?.haptics.map((tap) => [tap.atMs, tap.durationMs]);
    const designed: number[][] = [];
    let at = 0;
    buzzes.forEach((ms, i) => {
      if (i % 2 === 0) designed.push([at, ms]);
      at += ms;
    });
    expect(taps).toEqual(designed);
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

  it('plays the whole hold when it starts from empty', () => {
    const whole = CUES['hold-rising'];
    const fromEmpty = holdRisingFrom(0);
    if (!whole) throw new Error('missing hold-rising');
    expect(fromEmpty.haptics).toEqual(whole.haptics);
    expect(fromEmpty.render().left).toEqual(whole.render().left);
    expect(fromEmpty.render().right).toEqual(whole.render().right);
  });

  it('picks a half-full hold up in step, with the filled part left out', () => {
    const whole = holdRisingFrom(0);
    const half = holdRisingFrom(0.5);
    const wholeAudio = whole.render();
    const halfAudio = half.render();
    // The eased fill is half full at the middle of the hold.
    const skipped = HOLD_SECONDS / 2;
    expect(durationSeconds(wholeAudio) - durationSeconds(halfAudio)).toBeCloseTo(skipped, 1);
    expect(peak(halfAudio)).toBeLessThanOrEqual(0.9);
    expect(halfAudio.left.every(Number.isFinite)).toBe(true);

    // Half full is step 7 of 15, so the first note is that step, as it is in the whole hold there.
    const pitch = (audio: typeof halfAudio, from: number) => {
      const slice = toMono(audio).slice(
        Math.round(from * audio.sampleRate),
        Math.round((from + 0.12) * audio.sampleRate),
      );
      return dominantFrequency(slice, audio.sampleRate, 400);
    };
    expect(Math.abs(pitch(halfAudio, 0) / noteHz(7) - 1)).toBeLessThan(0.03);
    expect(Math.abs(pitch(wholeAudio, skipped) / noteHz(7) - 1)).toBeLessThan(0.03);

    // The taps count from the press: the same lead-in as a whole hold, the strength of a half-full
    // one, and the pop's tap where the shorter hold ends.
    expect(half.haptics.length).toBeLessThan(whole.haptics.length);
    expect(half.haptics[0]?.atMs).toBe(whole.haptics[0]?.atMs);
    expect(half.haptics[0]?.durationMs).toBe(15);
    expect(half.haptics.at(-1)).toEqual({ ...whole.haptics.at(-1), atMs: skipped * 1000 });
  });

  it('is only the pop when the button is already full', () => {
    const full = holdRisingFrom(1);
    expect(full.haptics.map((tap) => tap.atMs)).toEqual([0]);
    expect(full.render().left).toEqual(holdRisingAt(1).left);
  });
});
