// The eval for "pick for me": sends one short text at a time through stage one of the task call,
// as a phone with things parked does (`canChoose`), and checks whether it was read as a request to
// choose or as a task.
//   SCOOTCH_API_URL=http://localhost:8787 EVAL_CONCURRENCY=1 pnpm --filter @scootch/voice eval:choose
// It prints a table per language and exits non-zero when any task was read as a request to choose
// (that loses a person's words), or when under 80% of the requests were heard.
import { taskCreateStartResponseSchema } from '@scootch/domain';

import { atOnce, baseUrl, casesFor, languages, pooled, share, startTask } from '../shared.mjs';

const heardBar = 0.8;

async function runOne(language, token, testCase) {
  const { status, json, ms } = await startTask(language, token, testCase.text, {
    canChoose: true,
  });
  const start = taskCreateStartResponseSchema.safeParse(json);
  const got =
    status !== 200
      ? `http ${status}`
      : !start.success
        ? 'contract'
        : start.data.verdict === 'choose'
          ? 'choose'
          : start.data.verdict === 'pass'
            ? 'task'
            : start.data.verdict;
  return { id: testCase.id, wants: testCase.wants, got, ms };
}

console.log(`choose eval against ${baseUrl}, ${atOnce} at once`);
const all = [];
for (const language of languages) {
  const cases = casesFor(import.meta.url, language);
  const results = await pooled(
    language,
    cases.map((testCase) => (token) => runOne(language, token, testCase)),
  );
  console.log(`\n${language}`);
  console.table(
    results.map((result) => ({
      id: result.id,
      wants: result.wants,
      got: result.got,
      result: result.got === result.wants ? 'ok' : 'MISS',
      ms: result.ms,
    })),
  );
  all.push(...results);
}

const requests = all.filter((result) => result.wants === 'choose');
const tasks = all.filter((result) => result.wants === 'task');
const heard = requests.filter((result) => result.got === 'choose').length;
const lost = tasks.filter((result) => result.got === 'choose');
console.log(
  `\noverall: requests heard ${share(heard, requests.length)}; tasks read as a request ${share(lost.length, tasks.length)}`,
);
if (lost.length > 0) {
  console.error(
    `FAIL: a task was read as a request to choose: ${lost.map((one) => one.id).join(', ')}`,
  );
  process.exitCode = 1;
} else if (heard / requests.length < heardBar) {
  console.error(
    `FAIL: ${share(heard, requests.length)} of requests heard is under ${heardBar * 100}%`,
  );
  process.exitCode = 1;
} else {
  console.log('PASS');
}
