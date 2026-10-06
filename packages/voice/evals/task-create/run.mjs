// The task call's eval: sends every ramble to a running API as the phone does (stage one, then
// the monster's name and hatch line, then the pack with a treat) and checks each answer and how
// long each part took.
//   SCOOTCH_API_URL=http://localhost:8787 EVAL_CONCURRENCY=1 pnpm --filter @scootch/voice eval:task
//   EVAL_LANGUAGES=vi narrows the run; EVAL_OUTPUT=/tmp/answers.json keeps the answers;
//   EVAL_ATTITUDES=soft,cheeky asks only those; EVAL_ATTITUDES=rotate gives each ramble one
//   attitude in turn (a third of the calls). The default is every ramble at all three.
//   EVAL_CASES=3 runs only the first three rambles of each language, to try the runner out.
// Per answer it checks: one clear thing the ramble names, nothing invented, the voice check
// (banned words, the user's worth, missed days, off-limits topics, limits), instructions that are
// true to the app's controls, the language, no date the ramble does not give, the name-first and
// pack contracts, the new line slots with the treat named, and, where the case lists them, a body
// that fits. It exits non-zero under 96% on the checks, under 85% on body fit, or on a contract
// failure. EVAL_CONCURRENCY=1 gives the true latency. No ramble is heavy: the care screen has its
// own eval.
import { writeFileSync } from 'node:fs';

import {
  taskCreateNameResponseSchema,
  taskCreatePackResponseSchema,
  taskCreateResponseSchema,
  taskCreateStartResponseSchema,
} from '@scootch/domain';

import {
  checkTaskCopy,
  isGroundedIn,
  monsterFirstName,
  normalise,
  stripMarks,
  vietnameseShare,
  voiceGuides,
  wordsOf,
} from '../../src/index.ts';
import {
  atOnce,
  baseUrl,
  casesFor,
  languages,
  median,
  pooled,
  post,
  share,
  spread,
  startTask,
  waits,
} from '../shared.mjs';

const allAttitudes = ['soft', 'cheeky', 'unhinged'];
const asked = process.env.EVAL_ATTITUDES ?? allAttitudes.join(',');
const caseLimit = Number(process.env.EVAL_CASES ?? Infinity);
const passBar = 0.96;
const bodyBar = 0.85;
const targets = { nameMs: 3000, packMs: 5000, askedAgain: 0.1 };
const treats = { en: 'a flat white', vi: 'ly trà sữa' };

function names(text, keywords) {
  const bare = stripMarks(text);
  return keywords.some((keyword) =>
    new RegExp(`(?<![a-z0-9])${stripMarks(keyword)}(?![a-z0-9])`).test(bare),
  );
}

function inRightLanguage(text, language) {
  const part = vietnameseShare(text);
  const words = text.trim().split(/\s+/).length;
  return language === 'vi' ? words < 4 || part >= 0.3 : words < 3 || part <= 0.3;
}

/** The names of the checks one whole answer fails. An empty list is a pass. */
function failedChecks(testCase, language, attitude, answer) {
  const failed = [];
  if (!taskCreateResponseSchema.safeParse(answer).success) return ['contract'];
  const { oneThing, parked, deadlines, lines } = answer;
  const matched = testCase.things.filter((keywords) => names(oneThing.text, keywords)).length;
  if (matched !== 1) failed.push(matched === 0 ? 'one thing: not named' : 'one thing: not one');

  const rest = [...parked, ...deadlines].map(({ text }) => text);
  if (
    rest.some((text) => !isGroundedIn(text, testCase.text, language)) ||
    rest.length > testCase.things.length
  ) {
    failed.push('invented');
  }

  const reasons = new Set(
    checkTaskCopy(answer, language, attitude, treats[language]).flatMap((line) => line.reasons),
  );
  if (reasons.has('untrue_control')) failed.push('instructions');
  if (reasons.has('treat_not_named')) failed.push('slots: treat not named');
  const voice = [...reasons].filter(
    (reason) => !['wrong_language', 'untrue_control', 'treat_not_named'].includes(reason),
  );
  if (voice.length > 0) failed.push(`voice: ${voice.join(' ')}`);
  if (
    reasons.has('wrong_language') ||
    [oneThing.text, ...rest].some((text) => !inRightLanguage(text, language))
  ) {
    failed.push('language');
  }

  if (
    lines.tinierNextSteps?.length !== 2 ||
    [lines.treatHandOver, lines.parkedThoughts, lines.releasedEarly].includes(undefined)
  ) {
    failed.push('slots: absent');
  }

  const heard = [
    ...deadlines,
    ...(oneThing.dueDate === null ? [] : [{ dueDate: oneThing.dueDate }]),
  ];
  const source = normalise(testCase.text);
  if (
    heard.some(
      ({ dueDate, heardAs }) =>
        !testCase.dates.includes(dueDate) ||
        (heardAs !== undefined && !source.includes(normalise(heardAs))),
    )
  ) {
    failed.push('deadline');
  }
  return failed;
}

/** The first word of a monster name when an example or a default of the guide owns it. */
function takenOpening(name, language) {
  const taken = new Set(
    [
      ...voiceGuides[language].monsterNames.map(monsterFirstName),
      ...voiceGuides[language].nameAttractors,
      ...voiceGuides.en.nameAttractors,
    ].flatMap((first) => wordsOf(first)),
  );
  const [opening = ''] = wordsOf(name);
  return taken.has(opening) ? opening : null;
}

const attempts = (voice) => Number(/attempts=(\d+)/.exec(voice)?.[1] ?? 0);
const replaced = (voice) => Number(/replaced=(\d+)/.exec(voice)?.[1] ?? 0);

async function runOne(language, token, testCase, attitude) {
  const first = await startTask(language, token, testCase.text, {
    attitude,
    source: testCase.things.length > 1 ? 'ramble' : 'typed',
  });
  const result = { id: testCase.id, language, attitude, stageOneMs: first.ms };
  const start = taskCreateStartResponseSchema.safeParse(first.json);
  if (first.status !== 200 || !start.success || start.data.verdict !== 'pass') {
    const failed =
      first.status !== 200
        ? [`http ${first.status} (stage one)`]
        : start.success
          ? [`verdict:${start.data.verdict}`]
          : ['contract'];
    return { ...result, failed, answer: first.json };
  }
  const { continuation, ...things } = start.data;
  const fits =
    testCase.bodies === undefined ? undefined : testCase.bodies.includes(things.labels.bodyType);

  const second = await post('/v1/task-create/name', { continuation: continuation.token }, token);
  const name = taskCreateNameResponseSchema.safeParse(second.json);
  if (second.status !== 200 || !name.success) {
    const failed = [second.status === 200 ? 'contract' : `http ${second.status} (name)`];
    return { ...result, fits, failed, answer: second.json };
  }
  const third = await post(
    '/v1/task-create/pack',
    { continuation: name.data.continuation.token, treat: treats[language] },
    token,
  );
  const pack = taskCreatePackResponseSchema.safeParse(third.json);
  if (third.status !== 200 || !pack.success) {
    const failed = [third.status === 200 ? 'contract' : `http ${third.status} (pack)`];
    return { ...result, fits, failed, nameMs: second.ms, answer: third.json };
  }

  const answer = {
    ...things,
    monster: name.data.monster,
    lines: { hatch: name.data.hatch, ...pack.data.lines },
    notifications: pack.data.notifications,
  };
  return {
    ...result,
    fits,
    failed: failedChecks(testCase, language, attitude, answer),
    nameMs: second.ms,
    packMs: third.ms,
    askedAgain: attempts(second.voice) > 1 || attempts(third.voice) > 1,
    replaced: replaced(second.voice) + replaced(third.voice),
    offline: /source=offline/.test(second.voice) || /source=offline/.test(third.voice),
    takenOpening: takenOpening(name.data.monster.name, language),
    answer,
  };
}

function attitudesFor(index) {
  if (asked === 'rotate') return [allAttitudes[index % allAttitudes.length]];
  return asked.split(',');
}

function report(name, results) {
  const written = results.filter((result) => result.packMs !== undefined);
  const judged = results.filter((result) => result.fits !== undefined);
  const openings = written.flatMap((result) => result.takenOpening ?? []);
  const passed = results.filter((result) => result.failed.length === 0).length;
  console.log(`\n${name}: ${share(passed, results.length)} passed the checks`);
  console.log(`  stage one ms: ${spread(results.map((result) => result.stageOneMs))}`);
  console.log(`  name and hatch line ms: ${spread(results.map((result) => result.nameMs))}`);
  console.log(`  pack ms: ${spread(written.map((result) => result.packMs))}`);
  console.log(
    `  calls that asked the writer for a line once more: ${share(written.filter((result) => result.askedAgain).length, written.length)}`,
  );
  console.log(
    `  lines replaced by offline lines: ${written.reduce((sum, result) => sum + result.replaced, 0)} in ${written.filter((result) => result.replaced > 0).length} calls; answers with an offline part: ${written.filter((result) => result.offline).length}`,
  );
  console.log(
    `  body fits the task: ${share(judged.filter((result) => result.fits).length, judged.length)}`,
  );
  console.log(
    `  names opening with an example's or a default's word: ${openings.length}${openings.length > 0 ? ` (${[...new Set(openings)].join(', ')})` : ''}`,
  );
}

console.log(`task.create eval against ${baseUrl}, ${atOnce} at once, attitudes: ${asked}`);
const all = [];
for (const language of languages) {
  const results = await pooled(
    language,
    casesFor(import.meta.url, language)
      .slice(0, caseLimit)
      .flatMap((testCase, index) =>
        attitudesFor(index).map(
          (attitude) => (token) => runOne(language, token, testCase, attitude),
        ),
      ),
  );
  console.table(
    Object.values(Object.groupBy(results, (result) => result.id)).map((rows) => ({
      id: rows[0].id,
      ...Object.fromEntries(
        rows.map((row) => [row.attitude, row.failed.length === 0 ? 'ok' : row.failed.join('; ')]),
      ),
      body: rows[0].fits === undefined ? '' : rows.every((row) => row.fits) ? 'fits' : 'MISFIT',
      'slowest name ms': Math.max(...rows.map((row) => row.nameMs ?? 0)),
      'slowest pack ms': Math.max(...rows.map((row) => row.packMs ?? 0)),
    })),
  );
  report(language, results);
  all.push(...results);
}

if (process.env.EVAL_OUTPUT !== undefined) {
  writeFileSync(process.env.EVAL_OUTPUT, JSON.stringify(all, null, 1));
}

const count = (check) =>
  all.filter((result) => result.failed.some((name) => name.startsWith(check))).length;
const written = all.filter((result) => result.packMs !== undefined);
const judged = all.filter((result) => result.fits !== undefined);
const passed = all.filter((result) => result.failed.length === 0).length / all.length;
const bodyFit =
  judged.length === 0 ? 1 : judged.filter((result) => result.fits).length / judged.length;
const askedAgain =
  written.filter((result) => result.askedAgain).length / Math.max(written.length, 1);
const against = (value, target) => (value <= target ? 'met' : 'MISSED');

report('overall', all);
console.log(
  `failed checks: one thing ${count('one thing')}, invented ${count('invented')}, voice ${count('voice')}, instructions ${count('instructions')}, slots ${count('slots')}, language ${count('language')}, deadline ${count('deadline')}, contract ${count('contract')}, not a pass verdict ${count('verdict')}, http ${count('http')}`,
);
console.log(
  `targets: name median under ${targets.nameMs} ms ${against(median(all.map((result) => result.nameMs)), targets.nameMs)}; pack median under ${targets.packMs} ms ${against(median(written.map((result) => result.packMs)), targets.packMs)}; under ${targets.askedAgain * 100}% of calls ask again ${askedAgain < targets.askedAgain ? 'met' : 'MISSED'}`,
);
if (waits.rateLimited > 0) {
  console.log(`requests waited out for the eval's own rate limit: ${waits.rateLimited}`);
}

if (count('contract') > 0) {
  console.error('FAIL: an answer did not match the contract');
  process.exitCode = 1;
} else if (passed < passBar) {
  console.error(`FAIL: ${(passed * 100).toFixed(1)}% on the checks is under ${passBar * 100}%`);
  process.exitCode = 1;
} else if (bodyFit < bodyBar) {
  console.error(`FAIL: body fit ${(bodyFit * 100).toFixed(1)}% is under ${bodyBar * 100}%`);
  process.exitCode = 1;
} else {
  console.log('PASS');
}
