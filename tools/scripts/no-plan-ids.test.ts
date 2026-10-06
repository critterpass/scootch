import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Code, comments and test names describe behaviour; plan bookkeeping stays in plans/ and docs/. Designed
 * behaviour is never labelled as a cut-down or a next version either (docs/workflow.md section 7).
 */
const repoRoot = path.resolve(import.meta.dirname, '../..');

const banned: { pattern: RegExp; what: string }[] = [
  // Plan and report folders are named `<yymmdd>-<hhmm>-<slug>`.
  { pattern: /\b\d{6}-\d{4}-[a-z]/, what: 'plan id' },
  // Requires a separator so wave maths like `phase1` stays legal.
  { pattern: /\bphase[ -]\d{1,2}\b/i, what: 'phase number' },
  // A space only: `task-1` is an ordinary id for a user's task in product data.
  { pattern: /\btasks? \d{1,2}\b/i, what: 'task number' },
  { pattern: /\bMVP\b/, what: 'deferral word' },
  // Version segments of URLs, identifiers and vendor API names (`/v2/`, `API_V2_KEY`, `API v2`) are not
  // deferrals.
  { pattern: /(?<![\w/.-])(?<!\bAPI )v2(?![\w/-]|\.\w)/i, what: 'deferral word' },
];

const sourceExtensions = /\.(ts|tsx|js|mjs|cjs|swift|kt|kts|sql|sh|ya?ml|json|astro|css)$/;
const excluded = /(^|\/)(plans|docs|design|node_modules|fixtures)\//;

function trackedSourceFiles(): string[] {
  const output = execFileSync('git', ['ls-files', 'apps', 'packages', 'tools', 'e2e'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return output
    .split('\n')
    .filter(
      (file) =>
        (sourceExtensions.test(file) || file.endsWith('.env.example')) && !excluded.test(file),
    );
}

function findingsIn(line: string): string[] {
  return banned.filter(({ pattern }) => pattern.test(line)).map(({ what }) => what);
}

describe('banned patterns', () => {
  it('flags plan, phase and task references', () => {
    expect(findingsIn('see plans/261006-2350-scootch-full-build')).toEqual(['plan id']);
    expect(findingsIn('// wired up in phase 03')).toEqual(['phase number']);
    expect(findingsIn('// Phase-4 adds the drawer')).toEqual(['phase number']);
    expect(findingsIn('// the contracts from task 6')).toEqual(['task number']);
    expect(findingsIn('// lane A owns tasks 1 to 6')).toEqual(['task number']);
  });

  it('flags deferral words for designed behaviour', () => {
    expect(findingsIn('// good enough for the MVP')).toEqual(['deferral word']);
    expect(findingsIn('// tables get presence in v2.')).toEqual(['deferral word']);
    expect(findingsIn('// V2: share cards')).toEqual(['deferral word']);
  });

  it('allows product ids, wave maths and vendor API versions', () => {
    expect(findingsIn("const task = { id: 'task-1' };")).toEqual([]);
    expect(findingsIn('const phase1 = Math.sin(t);')).toEqual([]);
    expect(findingsIn('REVENUECAT_API_V2_KEY=')).toEqual([]);
    expect(findingsIn("fetch('https://api.revenuecat.com/v2/projects')")).toEqual([]);
    expect(findingsIn('// RevenueCat REST API v2 lists entitlements per project')).toEqual([]);
    expect(findingsIn("import { uuidv2 } from './ids';")).toEqual([]);
  });
});

describe('no plan bookkeeping in source', () => {
  it('keeps plan, phase and task ids and deferral words out of tracked source', () => {
    const findings: string[] = [];
    for (const file of trackedSourceFiles()) {
      if (file === 'tools/scripts/no-plan-ids.test.ts') continue;
      const lines = readFileSync(path.join(repoRoot, file), 'utf8').split('\n');
      lines.forEach((line, index) => {
        for (const what of findingsIn(line))
          findings.push(`${file}:${index + 1} ${what}: ${line.trim().slice(0, 120)}`);
      });
    }
    expect(findings).toEqual([]);
    // Reads every tracked source file; CI runners are about 3x slower than a dev machine.
  }, 60_000);
});
