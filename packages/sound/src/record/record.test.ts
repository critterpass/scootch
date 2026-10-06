import { describe, expect, it } from 'vitest';

import { durationSeconds, peak, rmsDb, type Stereo } from '../core/signal';
import { occupiedOctaves } from '../core/spectrum';

import { BAR_SECONDS } from './band';
import { composeBar, type FinishedDay, RECORD_INSTRUMENTS } from './bar';
import { clip } from './clip';
import { composeWeek, type Track } from './compose-week';

const SEEDS = ['dentist', 'council', 'taxes', 'grout', 'socks', 'mum', 'piano'];
const WEEK: FinishedDay[] = SEEDS.map((seed, weekday) => ({ weekday, seed }));

/** The mono sound of the last bar the whole band plays. */
function lastBarTogether(track: Track): Float32Array {
  const section = track.sections.findLast((s) => s.kind === 'together');
  if (!section) throw new Error('no bar together');
  const from = Math.round(section.startSeconds * track.sampleRate);
  const to = Math.round((section.startSeconds + BAR_SECONDS) * track.sampleRate);
  return track.left.slice(from, to).map((v, i) => (v + (track.right[from + i] ?? 0)) / 2);
}

function expectDecayToSilence(audio: Stereo): void {
  const end = durationSeconds(audio);
  expect(rmsDb(audio, end - 2, end - 1.5)).toBeGreaterThan(rmsDb(audio, end - 1, end - 0.5));
  expect(rmsDb(audio, end - 1, end - 0.5)).toBeGreaterThan(rmsDb(audio, end - 0.5, end));
  expect(rmsDb(audio, end - 0.02, end)).toBeLessThan(-60);
}

describe('the record', { timeout: 120_000 }, () => {
  const full = composeWeek(WEEK);
  const oneDay = composeWeek([{ weekday: 0, seed: 'dentist' }]);

  it('gives each weekday its own instrument, Monday to Sunday', () => {
    expect(WEEK.map((day) => composeBar(day).instrument)).toEqual([...RECORD_INSTRUMENTS]);
  });

  it('composes the same bar and the same track from the same days', () => {
    expect(composeBar({ weekday: 2, seed: 'taxes' })).toEqual(
      composeBar({ weekday: 2, seed: 'taxes' }),
    );
    const again = composeWeek([...WEEK].reverse());
    expect(again.left).toEqual(full.left);
    expect(again.right).toEqual(full.right);
    expect(again.sections).toEqual(full.sections);
  });

  it('writes a different bar for a different monster', () => {
    const bars = ['dentist', 'council', 'taxes', 'grout', 'socks', 'mum'].map((seed) =>
      JSON.stringify(composeBar({ weekday: 4, seed }).notes),
    );
    expect(new Set(bars).size).toBeGreaterThan(1);
    const other = composeWeek(WEEK.map((day) => ({ ...day, seed: `${day.seed}-again` })));
    expect(other.left).not.toEqual(full.left);
  });

  it('brings the instruments in one at a time and ends with all of them', () => {
    const entrances = full.sections.filter((s) => s.kind === 'entrance');
    expect(entrances.map((s) => s.instruments.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(full.sections.at(-1)?.kind).toBe('ending');
    expect(full.sections.at(-2)?.instruments).toEqual([...RECORD_INSTRUMENTS]);
  });

  it('ends a one-day week and a seven-day week with a decay to silence', () => {
    expectDecayToSilence(oneDay);
    expectDecayToSilence(full);
    expect(peak(oneDay)).toBeLessThanOrEqual(0.9);
    expect(peak(full)).toBeLessThanOrEqual(0.9);
  });

  it('makes the seven-day week longer, with more voices near its end', () => {
    expect(durationSeconds(full)).toBeGreaterThan(durationSeconds(oneDay) * 2);
    expect(full.sections.at(-2)?.instruments.length).toBe(7);
    expect(oneDay.sections.at(-2)?.instruments).toEqual(['keys']);
    expect(occupiedOctaves(lastBarTogether(full), full.sampleRate)).toBeGreaterThan(
      occupiedOctaves(lastBarTogether(oneDay), oneDay.sampleRate),
    );
  });

  it('plays a week with missing days as a smaller band that still builds and ends', () => {
    const four = composeWeek(
      [WEEK[5], WEEK[0], WEEK[3], WEEK[2]].filter((day) => day !== undefined),
    );
    expect(four.sections.at(-2)?.instruments).toEqual(['keys', 'marimba', 'drums', 'bells']);
    expect(four.sections.at(-1)?.kind).toBe('ending');
    expect(durationSeconds(four)).toBeGreaterThan(durationSeconds(oneDay));
    expect(durationSeconds(four)).toBeLessThan(durationSeconds(full));
    expectDecayToSilence(four);
  });

  it('gives an empty track for a week with no finished days', () => {
    expect(composeWeek([]).left.length).toBe(0);
  });

  it('cuts a clip of the requested length that ends at silence', () => {
    const cut = clip(full, 15);
    expect(cut.left.length).toBe(15 * 44100);
    expect(cut.right.length).toBe(15 * 44100);
    expect(Math.abs(cut.left.at(-1) ?? 1)).toBe(0);
    expect(rmsDb(cut, 14.95)).toBeLessThan(-60);
    expect(Math.abs(cut.left[0] ?? 1)).toBe(0);
    expect(rmsDb(cut, 1, 14)).toBeGreaterThan(-40);

    const short = clip(oneDay, 15);
    expect(short.left.length).toBe(15 * 44100);
    expect(short.left.slice(0, 1000)).toEqual(oneDay.left.slice(0, 1000));
    expect(rmsDb(short, 14)).toBeLessThan(-60);
  });
});
