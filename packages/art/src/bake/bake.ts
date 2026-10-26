// Node only: writes the baked image sets into an asset catalogue. Never imported by the app.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { DrawCommand } from '../core/commands';

import {
  BAKE_SCALES,
  isDrawing,
  type BakedArt,
  type BakedDrawing,
  type DrawingLook,
} from './baked-art';

/** Changing how an image set is written changes this, so everything is baked again. */
const BAKE_FORMAT = 1;
export const MANIFEST_FILE = 'bake-manifest.json';

/** Draws a command list to a square PNG `pixels` wide, on a transparent ground. */
export type RenderPng = (commands: readonly DrawCommand[], pixels: number) => Uint8Array;

/** Draws one look of a drawing to a PNG `width` by `height` pixels, on a transparent ground. */
export type RenderDrawing = (look: DrawingLook, width: number, height: number) => Uint8Array;

export interface BakeManifest {
  readonly format: number;
  /** The hash of each image set's drawing, by name. */
  readonly art: Readonly<Record<string, string>>;
}

export interface BakeResult {
  readonly written: readonly string[];
  readonly skipped: readonly string[];
}

/** The hash of one image: its drawing, its size and the format it is written in. */
export function artHash(art: BakedArt): string {
  const parts = isDrawing(art)
    ? [BAKE_FORMAT, 'drawing', art.width, art.height, BAKE_SCALES, art.light, art.dark ?? null]
    : [BAKE_FORMAT, art.points, art.template, BAKE_SCALES, art.commands];
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

export function manifestOf(all: readonly BakedArt[]): BakeManifest {
  return {
    format: BAKE_FORMAT,
    art: Object.fromEntries(all.map((art) => [art.name, artHash(art)])),
  };
}

export function readManifest(catalogue: string): BakeManifest | null {
  const file = path.join(catalogue, MANIFEST_FILE);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as BakeManifest;
  } catch {
    return null;
  }
}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

type Look = 'light' | 'dark';

/** Every file of an image set: one per scale, and per look when the dark one differs. */
function filesOf(
  art: BakedArt,
): { readonly look: Look; readonly scale: number; readonly name: string }[] {
  const looks: Look[] = isDrawing(art) && art.dark !== undefined ? ['light', 'dark'] : ['light'];
  return looks.flatMap((look) =>
    BAKE_SCALES.map((scale) => ({
      look,
      scale,
      name: `${art.name}${look === 'dark' ? '-dark' : ''}@${scale}x.png`,
    })),
  );
}

function imageSetContents(art: BakedArt) {
  return {
    images: filesOf(art).map(({ look, scale, name }) => ({
      ...(look === 'dark' ? { appearances: [{ appearance: 'luminosity', value: 'dark' }] } : {}),
      filename: name,
      idiom: 'universal',
      scale: `${scale}x`,
    })),
    info: { author: 'xcode', version: 1 },
    ...(!isDrawing(art) && art.template
      ? { properties: { 'template-rendering-intent': 'template' } }
      : {}),
  };
}

function renderFile(
  art: BakedArt,
  look: Look,
  scale: number,
  render: RenderPng,
  draw: RenderDrawing | undefined,
): Uint8Array {
  if (!isDrawing(art)) return render(art.commands, art.points * scale);
  if (draw === undefined)
    throw new Error(`${art.name} is a drawing; bake needs a drawing renderer`);
  const drawing: BakedDrawing = art;
  const chosen = look === 'dark' ? (drawing.dark ?? drawing.light) : drawing.light;
  return draw(chosen, drawing.width * scale, drawing.height * scale);
}

/**
 * Writes each image as an image set (1x, 2x, 3x) into the asset catalogue at `catalogue`. An image
 * whose hash is already in the manifest, and whose files are all there, is left alone.
 */
export function bake(
  all: readonly BakedArt[],
  catalogue: string,
  render: RenderPng,
  draw?: RenderDrawing,
): BakeResult {
  const before = readManifest(catalogue);
  const written: string[] = [];
  const skipped: string[] = [];

  mkdirSync(catalogue, { recursive: true });
  const root = path.join(catalogue, 'Contents.json');
  if (!existsSync(root)) writeFileSync(root, json({ info: { author: 'xcode', version: 1 } }));

  for (const art of all) {
    const folder = path.join(catalogue, `${art.name}.imageset`);
    const files = filesOf(art);
    const unchanged =
      before?.format === BAKE_FORMAT &&
      before.art[art.name] === artHash(art) &&
      existsSync(path.join(folder, 'Contents.json')) &&
      files.every((file) => existsSync(path.join(folder, file.name)));
    if (unchanged) {
      skipped.push(art.name);
      continue;
    }
    mkdirSync(folder, { recursive: true });
    for (const file of files) {
      writeFileSync(
        path.join(folder, file.name),
        renderFile(art, file.look, file.scale, render, draw),
      );
    }
    writeFileSync(path.join(folder, 'Contents.json'), json(imageSetContents(art)));
    written.push(art.name);
  }

  writeFileSync(path.join(catalogue, MANIFEST_FILE), json(manifestOf(all)));
  return { written, skipped };
}
