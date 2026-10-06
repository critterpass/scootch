import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { canvas, compareSheets, SHEET, type DesignScreen, type SheetState } from './compare-sheets';

const VARIANTS = ['en-light-default', 'vi-light-default'];

const hello: DesignScreen = {
  board: 'Scootch',
  section: '01 First launch',
  screen: 'Hello',
  path: 'design/renders/scootch/01-first-launch--hello.png',
  width: 10,
  height: 20,
};

function state(id: string, design: SheetState['design'], reason?: string): SheetState {
  return {
    id,
    design,
    variants: VARIANTS,
    ...(reason === undefined ? {} : { undesignedReason: reason }),
  };
}

const designed = state('hello', { board: 'Scootch', section: '01 First launch', screen: 'Hello' });

describe('design-beside-device sheets', () => {
  let root: string;
  let capturesDir: string;
  let outDir: string;

  /** A tiny plain image of the given size. */
  const image = (file: string, width: number, height: number) => {
    mkdirSync(path.dirname(file), { recursive: true });
    const tile = canvas.createCanvas(width, height);
    const ctx = tile.getContext('2d');
    ctx.fillStyle = '#e4572e';
    ctx.fillRect(0, 0, width, height);
    writeFileSync(file, tile.toBuffer('image/png'));
  };
  const capture = (name: string, width: number, height: number) =>
    image(path.join(capturesDir, `${name}.png`), width, height);
  const compare = (states: SheetState[]) =>
    compareSheets({ states, designScreens: [hello], designRoot: root, capturesDir, outDir });
  const sheetSize = async (file: string) => {
    const sheet = await canvas.loadImage(readFileSync(file));
    return { width: sheet.width, height: sheet.height };
  };

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'sheets-'));
    capturesDir = path.join(root, 'screens');
    outDir = path.join(root, 'sheets');
    mkdirSync(capturesDir);
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('puts a design and every captured variant side by side on one sheet', async () => {
    image(path.join(root, hello.path), 20, 40);
    capture('hello--en-light-default', 30, 60);
    capture('hello--vi-light-default', 30, 60);

    const result = await compare([designed]);

    expect(result.sheets).toEqual([path.join(outDir, 'hello.png')]);
    // Three panels of the same shape, each drawn at the sheet's panel height.
    const panel = SHEET.panelHeight / 2;
    expect(await sheetSize(path.join(outDir, 'hello.png'))).toEqual({
      width: SHEET.pad * 2 + panel * 3 + SHEET.gap * 2,
      height: SHEET.pad * 2 + SHEET.caption + SHEET.panelHeight,
    });
    expect(result.noDesign).toEqual([]);
    expect(result.noCapture).toEqual([]);
    expect(result.sizeMismatches).toEqual([]);
  });

  it('reports a state nobody captured and writes no sheet for it', async () => {
    image(path.join(root, hello.path), 20, 40);

    const result = await compare([designed]);

    expect(result.sheets).toEqual([]);
    expect(readdirSync(outDir)).toEqual(['summary.md']);
    expect(result.noCapture).toEqual([{ id: 'hello', missing: VARIANTS, expected: 2 }]);
    expect(readFileSync(result.summaryPath, 'utf8')).toContain('- `hello`: none of its 2 variants');
  });

  it('names the variants missing from a state that was partly captured', async () => {
    image(path.join(root, hello.path), 20, 40);
    capture('hello--en-light-default', 30, 60);

    const result = await compare([designed]);

    expect(result.sheets).toHaveLength(1);
    expect(result.noCapture).toEqual([{ id: 'hello', missing: ['vi-light-default'], expected: 2 }]);
  });

  it('still draws the captures of a state with no design, and says why it has none', async () => {
    capture('gap--en-light-default', 30, 60);
    capture('gap--vi-light-default', 30, 60);
    capture('unlisted--en-light-default', 30, 60);
    capture('hello--en-light-default', 30, 60);

    const result = await compare([
      state('gap', null, 'The design has no screen for a failed save.'),
      state('unlisted', { board: 'Scootch', section: '01 First launch', screen: 'Goodbye' }),
      designed,
    ]);

    expect(result.noDesign).toEqual([
      { id: 'gap', reason: 'The design has no screen for a failed save.' },
      {
        id: 'unlisted',
        reason: '"Scootch / 01 First launch / Goodbye" is not in design/screens.json',
      },
      { id: 'hello', reason: `no render at ${hello.path}` },
    ]);
    // An outlined place for the design, as wide as a capture, then the two captures.
    const panel = SHEET.panelHeight / 2;
    expect((await sheetSize(path.join(outDir, 'gap.png'))).width).toBe(
      SHEET.pad * 2 + panel * 3 + SHEET.gap * 2,
    );
  });

  it('reports a capture whose shape is not the design’s, and images it cannot place', async () => {
    image(path.join(root, hello.path), 20, 40);
    capture('hello--en-light-default', 30, 60);
    capture('hello--vi-light-default', 40, 60);
    capture('fresh-01-first-launch', 30, 60);

    const result = await compare([designed]);

    expect(result.sizeMismatches).toEqual([
      { capture: 'hello--vi-light-default', captured: '40×60', designed: '10×20' },
    ]);
    expect(result.unknownCaptures).toEqual(['fresh-01-first-launch.png']);
  });
});
