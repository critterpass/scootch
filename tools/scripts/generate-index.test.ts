import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generatedIndexName, indexIsCurrent, writeIndex } from './generate-index';

describe('registry index generator', () => {
  let folder: string;
  const readIndex = () => readFileSync(path.join(folder, generatedIndexName), 'utf8');
  const add = (name: string) => writeFileSync(path.join(folder, name), 'export {};\n');

  beforeEach(() => {
    folder = mkdtempSync(path.join(tmpdir(), 'registry-'));
  });
  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  it('exports every entry file, sorted and without extensions', () => {
    add('quiet.ts');
    add('body-double.tsx');
    writeIndex(folder);
    expect(readIndex().split('\n').slice(1)).toEqual([
      "export * from './body-double';",
      "export * from './quiet';",
      '',
    ]);
  });

  it('leaves out tests, declarations, index files and sub-folders', () => {
    add('quiet.ts');
    add('quiet.test.ts');
    add('types.d.ts');
    add('index.ts');
    add('notes.json');
    mkdirSync(path.join(folder, 'parts'));
    writeIndex(folder);
    writeIndex(folder);
    expect(readIndex().split('\n').slice(1)).toEqual(["export * from './quiet';", '']);
  });

  it('stays a module when the registry is empty', () => {
    writeIndex(folder);
    expect(readIndex()).toContain('export {};');
  });

  it('reports an index as stale until it is regenerated for a new entry', () => {
    add('quiet.ts');
    expect(indexIsCurrent(folder)).toBe(false);
    writeIndex(folder);
    expect(indexIsCurrent(folder)).toBe(true);
    add('sprint.ts');
    expect(indexIsCurrent(folder)).toBe(false);
    writeIndex(folder);
    expect(indexIsCurrent(folder)).toBe(true);
  });
});
