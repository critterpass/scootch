import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from '@jest/globals';

const SOURCE = path.resolve(__dirname, '..');
/** Everywhere a screen can be written: the features, the shared controls and the routes. */
const FOLDERS = ['features', 'ui', 'app'];

function sourceFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.tsx$/.test(entry.name) ? [file] : [];
  });
}

/**
 * A spoken line written into a screen: a string or template literal handed to one of the props
 * that carry Scootch's words (`line`, `more`, `reasons`), directly or inside braces.
 */
const LITERAL_LINE = /<[A-Z]\w*[^<>]*?\s(?:line|more)=(?:["'`]|\{\s*["'`])/s;

describe("Scootch's words", () => {
  it('finds a literal line when there is one', () => {
    expect(LITERAL_LINE.test('<ScootchSays mood="waiting" line="Hello there" />')).toBe(true);
    expect(LITERAL_LINE.test("<HelloView\n  line={'Hello there'}\n/>")).toBe(true);
    expect(LITERAL_LINE.test('<ScootchSays mood="waiting" line={said} />')).toBe(false);
    expect(LITERAL_LINE.test('<ScootchSays line={null} more={more} />')).toBe(false);
  });

  it('are never written into a screen', () => {
    const files = FOLDERS.flatMap((folder) => sourceFiles(path.join(SOURCE, folder)));
    expect(files.length).toBeGreaterThan(10);

    const offenders = files.filter((file) => LITERAL_LINE.test(readFileSync(file, 'utf8')));
    expect(offenders.map((file) => path.relative(SOURCE, file))).toEqual([]);
  });
});
