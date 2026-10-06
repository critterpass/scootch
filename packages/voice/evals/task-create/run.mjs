// The task call's eval: sends every ramble to a running API at each attitude, in two stages as the
// phone does, and checks the answer and how long each stage took.
//   SCOOTCH_API_URL=http://localhost:8787 EVAL_CONCURRENCY=1 pnpm --filter @scootch/voice eval:task
//   (EVAL_LANGUAGES=vi and EVAL_OUTPUT=/tmp/answers.json narrow the run and keep the answers)
// Per case and attitude it checks one clear thing the ramble names, nothing invented, the voice
// check, the language, no date the ramble does not give, and the contract. Per language it reports
// the time to each stage, lines asked for once more or replaced by offline lines, and names that
// open with an example's or a default's word. It exits non-zero under 90% or on a contract
// failure. EVAL_CONCURRENCY=1 gives the true latency. No ramble is heavy: the care screen has
// its own eval.
import { readFileSync, writeFileSync } from 'node:fs';

import {
  taskCreateLinesResponseSchema,
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

const baseUrl = (process.env.SCOOTCH_API_URL ?? 'https://scootch-dev.bkdev98.workers.dev').replace(
  /\/+$/,
  '',
);
const languages = (process.env.EVAL_LANGUAGES ?? 'en,vi').split(',');
const attitudes = ['soft', 'cheeky', 'unhinged'];
const passBar = 0.9;
const atOnce = Number(process.env.EVAL_CONCURRENCY ?? 4);
// A Tuesday, so every weekday in the rambles resolves to one known date.
const localDate = '2026-10-06';
const timeZones = { en: 'Europe/London', vi: 'Asia/Ho_Chi_Minh' };

function casesFor(language) {
  return JSON.parse(readFileSync(new URL(`./cases.${language}.json`, import.meta.url), 'utf8'));
}

let rateLimited = 0;

async function post(path, body, token) {
  for (;;) {
    const started = performance.now();
    const response = await fetch(baseUrl + path, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    });
    // The eval's own request rate, not the route: wait and ask once more, timing only the answer.
    if (response.status === 429) {
      rateLimited += 1;
      await response.body?.cancel();
      await new Promise((resolve) => setTimeout(resolve, 15_000));
      continue;
    }
    const json = await response.json().catch(() => undefined);
    return {
      status: response.status,
      voice: response.headers.get('x-voice-check') ?? '',
      json,
      ms: Math.round(performance.now() - started),
    };
  }
}

async function registerDevice(language) {
  const { status, json } = await post('/v1/devices', { language });
  if (status !== 200 || typeof json?.token !== 'string') {
    throw new Error(`could not register a device at ${baseUrl} (HTTP ${status})`);
  }
  return json.token;
}

function names(text, keywords) {
  const bare = stripMarks(text);
  return keywords.some((keyword) =>
    new RegExp(`(?<![a-z0-9])${stripMarks(keyword)}(?![a-z0-9])`).test(bare),
  );
}

function inRightLanguage(text, language) {
  const share = vietnameseShare(text);
  const words = text.trim().split(/\s+/).length;
  return language === 'vi' ? words < 4 || share >= 0.3 : words < 3 || share <= 0.3;
}

/** The names of the checks one answer fails. An empty list is a pass. */
function failedChecks(testCase, language, attitude, answer) {
  const failed = [];
  if (!taskCreateResponseSchema.safeParse(answer).success) return ['contract'];
  if (answer.verdict !== 'pass') return [`verdict:${answer.verdict}`];

  const { oneThing, parked, deadlines } = answer;
  const matched = testCase.things.filter((keywords) => names(oneThing.text, keywords)).length;
  if (matched !== 1) failed.push(matched === 0 ? 'one thing: not named' : 'one thing: not one');

  const rest = [...parked, ...deadlines].map(({ text }) => text);
  if (
    rest.some((text) => !isGroundedIn(text, testCase.text, language)) ||
    rest.length > testCase.things.length
  ) {
    failed.push('invented');
  }

  const voice = checkTaskCopy(answer, language, attitude);
  if (voice.some(({ reasons }) => reasons.some((reason) => reason !== 'wrong_language'))) {
    failed.push(`voice: ${[...new Set(voice.flatMap(({ reasons }) => reasons))].join(' ')}`);
  }
  const tasks = [oneThing.text, ...rest];
  if (
    voice.some(({ reasons }) => reasons.includes('wrong_language')) ||
    tasks.some((text) => !inRightLanguage(text, language))
  ) {
    failed.push('language');
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

async function runOne(language, token, testCase, attitude) {
  const first = await post(
    '/v1/task-create',
    {
      language,
      attitude,
      energy: 'medium',
      text: testCase.text,
      source: testCase.things.length > 1 ? 'ramble' : 'typed',
      localDate,
      timeZone: timeZones[language],
      overrideSerious: false,
      staged: true,
    },
    token,
  );
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
  const second = await post('/v1/task-create/lines', { continuation: continuation.token }, token);
  const lines = taskCreateLinesResponseSchema.safeParse(second.json);
  const answer = { ...things, ...(lines.success ? lines.data : {}) };
  const failed =
    second.status !== 200
      ? [`http ${second.status} (stage two)`]
      : failedChecks(testCase, language, attitude, answer);
  return {
    ...result,
    failed,
    stageTwoMs: second.ms,
    attempts: Number(/attempts=(\d+)/.exec(second.voice)?.[1] ?? 0),
    replaced: Number(/replaced=(\d+)/.exec(second.voice)?.[1] ?? 0),
    offline: /source=offline/.test(second.voice),
    takenOpening: lines.success ? takenOpening(lines.data.monster.name, language) : null,
    answer,
  };
}

/** Runs the jobs a few at a time, in order. Each runner has its own device and its own limit. */
async function pooled(language, jobs) {
  const results = new Array(jobs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(atOnce, jobs.length) }, async () => {
      const token = await registerDevice(language);
      while (next < jobs.length) {
        const index = next;
        next += 1;
        results[index] = await jobs[index](token);
      }
    }),
  );
  return results;
}

function spread(values) {
  const sorted = values.filter((value) => value !== undefined).sort((a, b) => a - b);
  if (sorted.length === 0) return 'none';
  const at = (share) => sorted[Math.min(sorted.length - 1, Math.ceil(share * sorted.length) - 1)];
  return `median ${at(0.5)}, 95th percentile ${at(0.95)}, worst ${sorted.at(-1)} (${sorted.length} calls)`;
}

const share = (part, whole) => `${part} of ${whole} (${((part / whole) * 100).toFixed(1)}%)`;

function report(name, results) {
  const written = results.filter((result) => result.stageTwoMs !== undefined);
  const passed = results.filter((result) => result.failed.length === 0).length;
  const openings = written.flatMap((result) => result.takenOpening ?? []);
  console.log(`\n${name}: ${share(passed, results.length)} passed the checks`);
  console.log(`  stage one ms: ${spread(results.map((result) => result.stageOneMs))}`);
  console.log(`  stage two ms: ${spread(written.map((result) => result.stageTwoMs))}`);
  console.log(
    `  asked the writer for lines once more: ${share(written.filter((result) => result.attempts > 1).length, Math.max(written.length, 1))}`,
  );
  console.log(
    `  lines replaced by offline lines: ${written.reduce((sum, result) => sum + result.replaced, 0)} in ${written.filter((result) => result.replaced > 0).length} calls; wholly offline answers: ${written.filter((result) => result.offline).length}`,
  );
  console.log(
    `  names opening with an example's or a default's word: ${openings.length}${openings.length > 0 ? ` (${[...new Set(openings)].join(', ')})` : ''}`,
  );
  console.log(
    `  5xx answers: ${results.filter((result) => result.failed.some((check) => /^http 5/.test(check))).length}`,
  );
}

console.log(`task.create eval against ${baseUrl}, ${atOnce} at once`);
const all = [];
for (const language of languages) {
  const results = await pooled(
    language,
    casesFor(language).flatMap((testCase) =>
      attitudes.map((attitude) => (token) => runOne(language, token, testCase, attitude)),
    ),
  );
  console.table(
    Object.values(Object.groupBy(results, (result) => result.id)).map((rows) => ({
      id: rows[0].id,
      ...Object.fromEntries(
        rows.map((row) => [row.attitude, row.failed.length === 0 ? 'ok' : row.failed.join('; ')]),
      ),
      'slowest stage one ms': Math.max(...rows.map((row) => row.stageOneMs)),
      'slowest stage two ms': Math.max(...rows.map((row) => row.stageTwoMs ?? 0)),
    })),
  );
  report(language, results);
  all.push(...results);
}

if (process.env.EVAL_OUTPUT !== undefined) {
  writeFileSync(process.env.EVAL_OUTPUT, JSON.stringify(all, null, 1));
}

const passed = all.filter((result) => result.failed.length === 0).length;
const contractFailures = all.filter((result) => result.failed.includes('contract')).length;
const count = (check) =>
  all.filter((result) => result.failed.some((name) => name.startsWith(check))).length;

report('overall', all);
console.log(
  `failed checks: one thing ${count('one thing')}, invented ${count('invented')}, voice ${count('voice')}, language ${count('language')}, deadline ${count('deadline')}, contract ${contractFailures}, not a pass verdict ${count('verdict')}, http ${count('http')}`,
);
if (rateLimited > 0)
  console.log(`requests waited out for the eval's own rate limit: ${rateLimited}`);

if (contractFailures > 0) {
  console.error('FAIL: an answer did not match the contract');
  process.exitCode = 1;
} else if (passed / all.length < passBar) {
  console.error(`FAIL: ${((passed / all.length) * 100).toFixed(1)}% is under ${passBar * 100}%`);
  process.exitCode = 1;
} else {
  console.log('PASS');
}
