// The release check for the helpline table: production waits while any number, or any line's
// opening hours, has not been verified at its source. The app's production bundle runs this
// (apps/mobile/metro.config.js), and so must anything that puts the site into production.
//
//   pnpm exec tsx tools/scripts/check-helplines-verified.ts
import { fileURLToPath } from 'node:url';

import { unverifiedHelplines } from '../../packages/i18n/src/helplines/helpline-rules';
import { HELPLINES, type Helpline } from '../../packages/i18n/src/helplines/helpline-table';

/** What to print and the exit code: 0 only when every row and every hour has been verified. */
export function helplineReleaseCheck(lines: readonly Helpline[] = HELPLINES): {
  readonly exitCode: 0 | 1;
  readonly report: readonly string[];
} {
  const problems = unverifiedHelplines(lines);
  if (problems.length === 0) return { exitCode: 0, report: [] };
  return {
    exitCode: 1,
    report: [
      'The helpline table is not ready for production. A person must verify, at its source:',
      ...problems.map((problem) => `  - ${problem}`),
      'Then set its checkedOn date in packages/i18n/src/helplines/helpline-table.ts.',
    ],
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { exitCode, report } = helplineReleaseCheck();
  for (const line of report) console.error(line);
  process.exitCode = exitCode;
}
