// Node only: writes the baked image sets into an asset catalogue. Never imported by the app.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { DrawCommand } from '../core/commands';

import { BAKE_SCALES, type BakedArt } from './baked-art';

/** Changing how an image set is written changes this, so everything is baked again. */
const BAKE_FORMAT = 1;
export const MANIFEST_FILE = 'bake-manifest.json';

/** Draws a command list to a square PNG `pixels` wide, on a transparent ground. */
export type RenderPng = (commands: readonly DrawCommand[], pixels: number) => Uint8Array;

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
  return createHash('sha256')
    .update(JSON.stringify([BAKE_FORMAT, art.points, art.template, BAKE_SCALES, art.commands]))
    .digest('hex');
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
const fileName = (art: BakedArt, scale: number) => `${art.name}@${scale}x.png`;

function imageSetContents(art: BakedArt) {
  return {
    images: BAKE_SCALES.map((scale) => ({
      filename: fileName(art, scale),
      idiom: 'universal',
      scale: `${scale}x`,
    })),
    info: { author: 'xcode', version: 1 },
    ...(art.template ? { properties: { 'template-rendering-intent': 'template' } } : {}),
  };
}

/**
 * Writes each image as an image set (1x, 2x, 3x) into the asset catalogue at `catalogue`. An image
 * whose hash is already in the manifest, and whose files are all there, is left alone.
 */
export function bake(all: readonly BakedArt[], catalogue: string, render: RenderPng): BakeResult {
  const before = readManifest(catalogue);
  const written: string[] = [];
  const skipped: string[] = [];

  mkdirSync(catalogue, { recursive: true });
  const root = path.join(catalogue, 'Contents.json');
  if (!existsSync(root)) writeFileSync(root, json({ info: { author: 'xcode', version: 1 } }));

  for (const art of all) {
    const folder = path.join(catalogue, `${art.name}.imageset`);
    const files = BAKE_SCALES.map((scale) => path.join(folder, fileName(art, scale)));
    const unchanged =
      before?.format === BAKE_FORMAT &&
      before.art[art.name] === artHash(art) &&
      existsSync(path.join(folder, 'Contents.json')) &&
      files.every((file) => existsSync(file));
    if (unchanged) {
      skipped.push(art.name);
      continue;
    }
    mkdirSync(folder, { recursive: true });
    BAKE_SCALES.forEach((scale, index) => {
      writeFileSync(files[index] ?? '', render(art.commands, art.points * scale));
    });
    writeFileSync(path.join(folder, 'Contents.json'), json(imageSetContents(art)));
    written.push(art.name);
  }

  writeFileSync(path.join(catalogue, MANIFEST_FILE), json(manifestOf(all)));
  return { written, skipped };
}
