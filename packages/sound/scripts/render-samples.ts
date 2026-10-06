/**
 * Renders every cue, three sample weeks and a 15-second clip to WAV files for listening, and
 * prints what can be measured about each: length, peak, loudness, brightness and attack.
 *
 *   pnpm --filter @scootch/sound samples <folder>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  clip,
  composeWeek,
  CUES,
  durationSeconds,
  encodeWav,
  type FinishedDay,
  holdRisingAt,
  integratedLufs,
  linearToDb,
  peak,
  spectralCentroid,
  type Stereo,
  toMono,
} from '../src/index';

/** The monsters of a sample week, Monday to Sunday. */
const WEEK: readonly FinishedDay[] = [
  'dentist',
  'council',
  'taxes',
  'grout',
  'socks',
  'mum',
  'piano',
].map((seed, weekday) => ({ weekday, seed }));
const pickDays = (...weekdays: number[]) => WEEK.filter((day) => weekdays.includes(day.weekday));

/** Milliseconds for the loudness to climb from a tenth of its highest level to nine tenths. */
function attackMs(audio: Stereo): number {
  const mono = toMono(audio);
  const window = Math.round(audio.sampleRate * 0.002);
  const levels: number[] = [];
  for (let start = 0; start + window <= mono.length; start += window) {
    let sum = 0;
    for (let i = start; i < start + window; i += 1) sum += (mono[i] ?? 0) ** 2;
    levels.push(Math.sqrt(sum / window));
  }
  const top = Math.max(...levels);
  const tenth = levels.findIndex((level) => level >= top * 0.1);
  const most = levels.findIndex((level) => level >= top * 0.9);
  return (most - tenth) * 2;
}

function main(folder: string | undefined): void {
  if (!folder) {
    console.error('Usage: samples <folder>');
    process.exitCode = 1;
    return;
  }
  mkdirSync(folder, { recursive: true });
  const fullWeek = composeWeek(WEEK);
  const samples: [string, Stereo][] = [
    ...Object.values(CUES).map((cue): [string, Stereo] => [`cue-${cue.name}`, cue.render()]),
    ['cue-hold-rising-at-10', holdRisingAt(0.1)],
    ['cue-hold-rising-at-90', holdRisingAt(0.9)],
    ['week-7-days', fullWeek],
    ['week-4-days', composeWeek(pickDays(0, 2, 3, 5))],
    ['week-1-day', composeWeek(pickDays(2))],
    ['clip-15-seconds', clip(fullWeek, 15)],
  ];
  console.log('| sample | seconds | peak dBFS | LUFS | centroid Hz | attack ms |');
  console.log('| --- | ---: | ---: | ---: | ---: | ---: |');
  for (const [name, audio] of samples) {
    writeFileSync(path.join(folder, `${name}.wav`), encodeWav(audio));
    const cells = [
      durationSeconds(audio).toFixed(2),
      linearToDb(peak(audio)).toFixed(1),
      integratedLufs(audio).toFixed(1),
      Math.round(spectralCentroid(toMono(audio), audio.sampleRate)),
      attackMs(audio),
    ];
    console.log(`| ${name} | ${cells.join(' | ')} |`);
  }
  console.log(`\n${samples.length} WAV files in ${path.resolve(folder)}`);
}

main(process.argv[2]);
