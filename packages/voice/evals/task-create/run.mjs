// The task call's eval: sends every ramble to a running API at each attitude and checks the answer.
//
//   pnpm --filter @scootch/voice eval:task
//   SCOOTCH_API_URL=http://localhost:8787 pnpm --filter @scootch/voice eval:task
//   EVAL_LANGUAGES=vi EVAL_OUTPUT=/tmp/answers.json pnpm --filter @scootch/voice eval:task
//
// Per case and attitude it checks: one clear thing that the ramble names; nothing invented; every
// line passes the voice check; the right language; no date the ramble does not give; and the
// contract. It exits non-zero under 90% or on any contract failure. The rambles are made up and
// none is heavy: the care screen has its own eval.
import { readFileSync, writeFileSync } from 'node:fs';

import { taskCreateResponseSchema } from '@scootch/domain';

import {
  checkTaskCopy,
  isGroundedIn,
  normalise,
  stripMarks,
  vietnameseShare,
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

async function post(path, body, token) {
  const response = await fetch(baseUrl + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    voice: response.headers.get('x-voice-check') ?? '',
    json: await response.json().catch(() => undefined),
  };
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

async function runOne(language, token, testCase, attitude) {
  const started = performance.now();
  const { status, json, voice } = await post(
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
    },
    token,
  );
  const ms = Math.round(performance.now() - started);
  const failed =
    status === 200 ? failedChecks(testCase, language, attitude, json) : [`http ${status}`];
  return {
    id: testCase.id,
    language,
    attitude,
    failed,
    ms,
    attempts: Number(/attempts=(\d+)/.exec(voice)?.[1] ?? 0),
    replaced: Number(/replaced=(\d+)/.exec(voice)?.[1] ?? 0),
    answer: json,
  };
}

/** Runs the jobs a few at a time, in order. */
async function pooled(jobs) {
  const results = new Array(jobs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(atOnce, jobs.length) }, async () => {
      while (next < jobs.length) {
        const index = next;
        next += 1;
        results[index] = await jobs[index]();
      }
    }),
  );
  return results;
}

console.log(`task.create eval against ${baseUrl}`);
const all = [];
for (const language of languages) {
  const token = await registerDevice(language);
  const results = await pooled(
    casesFor(language).flatMap((testCase) =>
      attitudes.map((attitude) => () => runOne(language, token, testCase, attitude)),
    ),
  );
  const passed = results.filter((result) => result.failed.length === 0).length;
  console.log(`\n${language}: ${passed} of ${results.length} passed`);
  console.table(
    Object.values(Object.groupBy(results, (result) => result.id)).map((rows) => ({
      id: rows[0].id,
      ...Object.fromEntries(
        rows.map((row) => [row.attitude, row.failed.length === 0 ? 'ok' : row.failed.join('; ')]),
      ),
      'slowest ms': Math.max(...rows.map((row) => row.ms)),
      retried: rows.filter((row) => row.attempts > 1).length,
      'lines replaced': rows.reduce((sum, row) => sum + row.replaced, 0),
    })),
  );
  all.push(...results);
}

if (process.env.EVAL_OUTPUT !== undefined) {
  writeFileSync(process.env.EVAL_OUTPUT, JSON.stringify(all, null, 1));
}

const times = all.map((result) => result.ms).sort((a, b) => a - b);
const passed = all.filter((result) => result.failed.length === 0).length;
const contractFailures = all.filter((result) => result.failed.includes('contract')).length;
const count = (check) =>
  all.filter((result) => result.failed.some((name) => name.startsWith(check))).length;

console.log(
  `\noverall: ${passed} of ${all.length} passed (${((passed / all.length) * 100).toFixed(1)}%)`,
);
console.log(
  `failed checks: one thing ${count('one thing')}, invented ${count('invented')}, voice ${count('voice')}, language ${count('language')}, deadline ${count('deadline')}, contract ${contractFailures}, not a pass verdict ${count('verdict')}, http ${count('http')}`,
);
console.log(
  `latency ms: median ${times[Math.floor(times.length / 2)]}, worst ${times.at(-1)} (${atOnce} at once)`,
);
console.log(
  `voice check: ${all.filter((result) => result.attempts > 1).length} of ${all.length} calls regenerated, ${all.filter((result) => result.replaced > 0).length} calls had a line replaced by an offline line (${all.reduce((sum, result) => sum + result.replaced, 0)} lines)`,
);

if (contractFailures > 0) {
  console.error('FAIL: an answer did not match the contract');
  process.exitCode = 1;
} else if (passed / all.length < passBar) {
  console.error(`FAIL: ${((passed / all.length) * 100).toFixed(1)}% is under ${passBar * 100}%`);
  process.exitCode = 1;
} else {
  console.log('PASS');
}
