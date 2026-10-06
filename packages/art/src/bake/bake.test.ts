import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { bake, manifestOf, readManifest, type RenderPng } from './bake';
import { bakedArt, type BakedArt } from './baked-art';
import { renderPngWithCanvas } from './render-png';

const COMMITTED = path.resolve(
  import.meta.dirname,
  '../../../../apps/mobile/targets/widgets/ScootchArt.xcassets',
);

const made: string[] = [];
function folder(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'scootch-bake-'));
  made.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function counting(): { render: RenderPng; calls: () => number } {
  let calls = 0;
  return {
    render: (commands, pixels) => {
      calls += 1;
      return renderPngWithCanvas(commands, pixels);
    },
    calls: () => calls,
  };
}

const png = (dir: string, art: BakedArt, scale: number) =>
  readFileSync(path.join(dir, `${art.name}.imageset`, `${art.name}@${scale}x.png`));

describe('the surface art baker', { timeout: 60_000 }, () => {
  const all = bakedArt();
  const sample = all.filter((art) => ['ScootchWorkingCheeky', 'GlyphPlay'].includes(art.name));

  it('bakes the same bytes every time', () => {
    const first = folder();
    const second = folder();
    bake(sample, first, renderPngWithCanvas);
    bake(sample, second, renderPngWithCanvas);
    for (const art of sample) {
      for (const scale of [1, 2, 3]) {
        expect(png(first, art, scale).equals(png(second, art, scale)), art.name).toBe(true);
      }
    }
    expect(readFileSync(path.join(first, 'bake-manifest.json'), 'utf8')).toBe(
      readFileSync(path.join(second, 'bake-manifest.json'), 'utf8'),
    );
  });

  it('skips art that has not changed and bakes only what did', () => {
    const dir = folder();
    const renderer = counting();
    expect(bake(sample, dir, renderer.render).written).toHaveLength(2);
    expect(renderer.calls()).toBe(6);

    const again = bake(sample, dir, renderer.render);
    expect(again.written).toEqual([]);
    expect(again.skipped).toHaveLength(2);
    expect(renderer.calls()).toBe(6);

    const changed = sample.map((art) =>
      art.name === 'GlyphPlay' ? { ...art, commands: art.commands.slice(0, 0) } : art,
    );
    expect(bake(changed, dir, renderer.render).written).toEqual(['GlyphPlay']);
    expect(renderer.calls()).toBe(9);
  });

  it('bakes an image again when one of its files is gone', () => {
    const dir = folder();
    bake(sample, dir, renderPngWithCanvas);
    rmSync(path.join(dir, 'GlyphPlay.imageset', 'GlyphPlay@2x.png'));
    expect(bake(sample, dir, renderPngWithCanvas).written).toEqual(['GlyphPlay']);
  });

  it('has every pose the surfaces ask for, and the serious pose once', () => {
    const names = all.map((art) => art.name);
    expect(new Set(names).size).toBe(names.length);
    for (const pose of ['Working', 'Waiting', 'Asleep', 'Celebrating']) {
      for (const attitude of ['Soft', 'Cheeky', 'Unhinged']) {
        expect(names).toContain(`Scootch${pose}${attitude}`);
      }
    }
    expect(names.filter((name) => name.startsWith('ScootchSerious'))).toEqual(['ScootchSerious']);
  });

  it('matches the baked art committed in the widget target', () => {
    // A drawing changed without running scripts/bake-surfaces.ts fails here.
    expect(readManifest(COMMITTED)).toEqual(manifestOf(all));
    const sets = readdirSync(COMMITTED).filter((name) => name.endsWith('.imageset'));
    expect(sets.sort()).toEqual(all.map((art) => `${art.name}.imageset`).sort());
  });
});
