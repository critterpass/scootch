// The labels' eval: asks a running API for the body and the work mode of one small task at a
// time, through stage one of the task call (where the labels are decided), and checks each
// against the bodies and work modes its case accepts.
//   SCOOTCH_API_URL=http://localhost:8787 EVAL_CONCURRENCY=1 pnpm --filter @scootch/voice eval:labels
// It prints a table per language and exits non-zero under 85% on body fit. The work mode is
// reported beside it and has no bar of its own yet.
import { taskCreateStartResponseSchema } from '@scootch/domain';

import { atOnce, baseUrl, casesFor, languages, pooled, share, startTask } from '../shared.mjs';

const bodyBar = 0.85;

async function runOne(language, token, testCase) {
  const { status, json, ms } = await startTask(language, token, testCase.text);
  const start = taskCreateStartResponseSchema.safeParse(json);
  if (status !== 200 || !start.success || start.data.verdict !== 'pass') {
    const got = status !== 200 ? `http ${status}` : start.success ? start.data.verdict : 'contract';
    return { id: testCase.id, body: got, bodyFits: false, workMode: got, workModeFits: false, ms };
  }
  const { bodyType, workMode } = start.data.labels;
  return {
    id: testCase.id,
    body: bodyType ?? 'none',
    bodyFits: testCase.bodies.includes(bodyType),
    workMode: workMode ?? 'none',
    workModeFits: testCase.workModes.includes(workMode),
    ms,
  };
}

console.log(`labels eval against ${baseUrl}, ${atOnce} at once`);
const all = [];
for (const language of languages) {
  const cases = casesFor(import.meta.url, language);
  const results = await pooled(
    language,
    cases.map((testCase) => (token) => runOne(language, token, testCase)),
  );
  console.log(`\n${language}`);
  console.table(
    results.map((result, index) => ({
      id: result.id,
      body: result.body,
      'body result': result.bodyFits ? 'ok' : `MISS (wanted ${cases[index].bodies.join(' or ')})`,
      'work mode': result.workMode,
      'work mode result': result.workModeFits
        ? 'ok'
        : `MISS (wanted ${cases[index].workModes.join(' or ')})`,
      ms: result.ms,
    })),
  );
  console.log(
    `  body fits: ${share(results.filter((result) => result.bodyFits).length, results.length)}; work mode fits: ${share(results.filter((result) => result.workModeFits).length, results.length)}`,
  );
  all.push(...results);
}

const bodyFit = all.filter((result) => result.bodyFits).length / all.length;
console.log(
  `\noverall: body fits ${share(all.filter((result) => result.bodyFits).length, all.length)}; work mode fits ${share(all.filter((result) => result.workModeFits).length, all.length)}`,
);
if (bodyFit < bodyBar) {
  console.error(`FAIL: body fit ${(bodyFit * 100).toFixed(1)}% is under ${bodyBar * 100}%`);
  process.exitCode = 1;
} else {
  console.log('PASS');
}
