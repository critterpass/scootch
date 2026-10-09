// The starting helpers' part of the task call's eval, run at the end of `eval:task`.
//   In the way: one thing typed with an answer to "Anything in the way?", through stage one, the
//   name and the pack. Scary and confusing must open on the right first step (opening it; writing
//   the one question), too big must come back as not fitting, so the app's shrink is offered, and
//   every line must pass the voice check whatever the answer.
//   A time heard: stage one only, asked at eleven in the morning on the phone's clock. A clock
//   time said for today comes back as that time, in words the ramble has; a time said for another
//   day comes back as that day's deadline and never as a time for today; no time, no heard time.
// It reports per case and fails under 90% on either set, or on any answer off the contract. No
// ramble is heavy: a heavy task is never asked what is in the way, and the care screen has its
// own eval.
import { readFileSync } from 'node:fs';

import {
  taskCreateNameResponseSchema,
  taskCreatePackResponseSchema,
  taskCreateStartResponseSchema,
} from '@scootch/domain';

import { checkTaskCopy, isGroundedIn, stripMarks } from '../../src/index.ts';
import { languages, pooled, post, share, startTask } from '../shared.mjs';

const attitudes = ['soft', 'cheeky', 'unhinged'];
const bar = 0.9;
const askedAt = '11:00';

/** The first step a scary thing gets only opens it; a confusing one writes down a question. */
const firstStep = {
  scary:
    /(?<![a-z])(open|opening|find|pull up|bring up|get out|look at|mo|tim|lay|nhin|xem)(?![a-z])/,
  confusing: /(?<![a-z])(question|ask|cau hoi|hoi)(?![a-z])/,
};

function casesOf(language) {
  return JSON.parse(readFileSync(new URL(`./helpers.${language}.json`, import.meta.url), 'utf8'));
}

async function inTheWay(language, token, testCase, attitude) {
  const result = { id: testCase.id, language, kind: 'in the way', note: testCase.inTheWay };
  const first = await startTask(language, token, testCase.text, {
    attitude,
    helpers: { inTheWay: testCase.inTheWay },
  });
  const start = taskCreateStartResponseSchema.safeParse(first.json);
  if (first.status !== 200 || !start.success) return { ...result, failed: ['contract'] };
  if (start.data.verdict !== 'pass')
    return { ...result, failed: [`verdict:${start.data.verdict}`] };
  const { continuation, ...things } = start.data;

  const second = await post('/v1/task-create/name', { continuation: continuation.token }, token);
  const name = taskCreateNameResponseSchema.safeParse(second.json);
  if (second.status !== 200 || !name.success) return { ...result, failed: ['contract'] };
  const third = await post(
    '/v1/task-create/pack',
    { continuation: name.data.continuation.token },
    token,
  );
  const pack = taskCreatePackResponseSchema.safeParse(third.json);
  if (third.status !== 200 || !pack.success) return { ...result, failed: ['contract'] };

  const failed = [];
  const lines = { hatch: name.data.hatch, ...pack.data.lines };
  const reasons = new Set(
    checkTaskCopy(
      {
        monster: name.data.monster,
        lines,
        notifications: pack.data.notifications,
        deadlines: things.deadlines,
        cueNotification: pack.data.cueNotification,
      },
      language,
      attitude,
    ).flatMap((line) => line.reasons),
  );
  if (reasons.size > 0) failed.push(`voice: ${[...reasons].join(' ')}`);

  const step = firstStep[testCase.inTheWay];
  if (step !== undefined) {
    // The writer's bites are dropped whole when one fails the check: then the tiny step stands.
    const opening = lines.bites?.[0]?.text ?? lines.tinyNextStep;
    if (!step.test(stripMarks(opening)) || !step.test(stripMarks(lines.tinyNextStep))) {
      failed.push(`first step: not ${testCase.inTheWay === 'scary' ? 'opening it' : 'a question'}`);
    }
  }
  if (testCase.inTheWay === 'too_big' && things.labels.fitsTenMinutes) {
    failed.push('too big: no shrink offered');
  }
  return { ...result, attitude, failed, answer: { ...things, lines } };
}

async function heardTime(language, token, testCase) {
  const result = { id: testCase.id, language, kind: 'time heard', note: testCase.at ?? 'none' };
  const first = await startTask(language, token, testCase.text, {
    source: 'ramble',
    helpers: { localTime: askedAt },
  });
  const start = taskCreateStartResponseSchema.safeParse(first.json);
  if (first.status !== 200 || !start.success) return { ...result, failed: ['contract'] };
  if (start.data.verdict !== 'pass')
    return { ...result, failed: [`verdict:${start.data.verdict}`] };

  const failed = [];
  const { heardTime: heard, deadlines, oneThing } = start.data;
  if (testCase.at === null && heard !== undefined) failed.push(`time: heard ${heard.at}`);
  if (testCase.at !== null && heard?.at !== testCase.at) {
    failed.push(`time: ${heard === undefined ? 'not heard' : `heard ${heard.at}`}`);
  }
  if (heard !== undefined && !isGroundedIn(heard.heardAs, testCase.text, language)) {
    failed.push('time: not in their words');
  }
  if (
    testCase.date !== undefined &&
    ![oneThing, ...deadlines].some(({ dueDate }) => dueDate === testCase.date)
  ) {
    failed.push('time: another day, and no deadline for it');
  }
  return { ...result, failed, answer: start.data };
}

/** Runs both sets in every language asked for. Returns whether the run passed. */
export async function runHelpers() {
  const all = [];
  for (const language of languages) {
    const cases = casesOf(language);
    const results = await pooled(language, [
      ...cases.inTheWay.map(
        (testCase, index) => (token) =>
          inTheWay(language, token, testCase, attitudes[index % attitudes.length]),
      ),
      ...cases.heardTime.map((testCase) => (token) => heardTime(language, token, testCase)),
    ]);
    console.table(
      results.map(({ id, kind, note, attitude, failed }) => ({
        id,
        kind,
        asked: note,
        attitude: attitude ?? '',
        result: failed.length === 0 ? 'ok' : failed.join('; '),
      })),
    );
    all.push(...results);
  }

  let passed = !all.some(({ failed }) => failed.includes('contract'));
  if (!passed) console.error('FAIL: a starting-helper answer did not match the contract');
  for (const kind of ['in the way', 'time heard']) {
    const of = all.filter((result) => result.kind === kind);
    const ok = of.filter(({ failed }) => failed.length === 0).length;
    console.log(`starting helpers, ${kind}: ${share(ok, of.length)} passed`);
    if (of.length > 0 && ok / of.length < bar) {
      console.error(`FAIL: ${kind} is under ${bar * 100}%`);
      passed = false;
    }
  }
  return { passed, results: all };
}
