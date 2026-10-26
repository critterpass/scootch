import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { bake, manifestOf, readManifest, type RenderPng } from './bake';
import {
  bakedArt,
  isDrawing,
  notificationArt,
  PRESSURE_MOOD_NAMES,
  SURFACE_MOODS,
  type BakedArt,
  type BakedGlyph,
} from './baked-art';
import { renderDrawingWithCanvas, renderPngWithCanvas } from './render-png';

const TARGETS = path.resolve(import.meta.dirname, '../../../../apps/mobile/targets');
const COMMITTED = [
  { folder: path.join(TARGETS, 'widgets/SurfaceArt.xcassets'), art: bakedArt },
  { folder: path.join(TARGETS, 'notification-service/NoteArt.xcassets'), art: notificationArt },
];

const made: string[] = [];
function folder(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'phusclass-bake-'));
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
  const sample = all.filter(
    (art): art is BakedGlyph => !isDrawing(art) && ['GlyphPlus', 'GlyphPlay'].includes(art.name),
  );

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

  it('names every image once', () => {
    const names = all.map((art) => art.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.slice(0, 3)).toEqual(['GlyphPlay', 'GlyphPlus', 'GlyphLock']);
  });

  it('has his face and figure in every mood the surfaces show, at every pressure step', () => {
    const names = new Set(all.map((art) => art.name));
    for (const mood of SURFACE_MOODS) {
      const swift = mood.charAt(0).toUpperCase() + mood.slice(1);
      expect(names.has(`PhuFace${swift}`), mood).toBe(true);
      expect(names.has(`PhuFigure${swift}`), mood).toBe(true);
    }
    // The order Swift reads the pressure ladder in (SurfaceArt.swift).
    expect(PRESSURE_MOOD_NAMES).toEqual(['Calm', 'Over', 'Crossed', 'Ruler', 'Name', 'Stare']);
    expect(notificationArt().map((art) => art.name)).toEqual(
      PRESSURE_MOOD_NAMES.map((name) => `PhuFigure${name}`),
    );
  });

  it('writes a drawing in light and dark, at every scale', () => {
    const dir = folder();
    const face = all.find((art) => art.name === 'PhuFaceCalm');
    if (face === undefined || !isDrawing(face)) throw new Error('no face');
    bake([face], dir, renderPngWithCanvas, renderDrawingWithCanvas);
    const files = readdirSync(path.join(dir, 'PhuFaceCalm.imageset')).sort();
    expect(files).toEqual([
      'Contents.json',
      'PhuFaceCalm-dark@1x.png',
      'PhuFaceCalm-dark@2x.png',
      'PhuFaceCalm-dark@3x.png',
      'PhuFaceCalm@1x.png',
      'PhuFaceCalm@2x.png',
      'PhuFaceCalm@3x.png',
    ]);
    const contents = JSON.parse(
      readFileSync(path.join(dir, 'PhuFaceCalm.imageset', 'Contents.json'), 'utf8'),
    ) as { images: { appearances?: unknown[] }[] };
    expect(contents.images.filter((image) => image.appearances !== undefined)).toHaveLength(3);
    // 3x is three times 1x: a 64 point face is 192 pixels wide.
    const png = readFileSync(path.join(dir, 'PhuFaceCalm.imageset', 'PhuFaceCalm@3x.png'));
    expect(png.readUInt32BE(16)).toBe(192);
  });

  it('matches the baked art committed in the targets', () => {
    // A drawing changed without running scripts/bake-surfaces.ts fails here.
    for (const { folder: committed, art } of COMMITTED) {
      const wanted = art();
      expect(readManifest(committed)).toEqual(manifestOf(wanted));
      const sets = readdirSync(committed).filter((name) => name.endsWith('.imageset'));
      expect(sets.sort()).toEqual(wanted.map((one) => `${one.name}.imageset`).sort());
    }
  });
});
