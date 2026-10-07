/**
 * Reading a photo on the phone. Apple's Vision reports raw text lines with image signals, and the
 * separate things in a picture with what its classifier calls them; this layer puts the lines in
 * reading order with stable ids `l{index}`, names the one quality problem worth a retake, and
 * tidies the things into ids `t{index}`, boxes inside the photo and plain lower-case names.
 * Nothing here uses the network: what leaves the phone, if anything, is decided by the caller.
 */
import { orderLines } from './src/order-lines';
import { classifyQuality } from './src/quality';
import {
  nativeScootchReadingModule,
  type NativeScootchReadingModule,
} from './src/ScootchReadingModule';
import type { OcrBox, RawOcrLine, ReadingApi } from './src/types';

export type {
  OcrBox,
  OcrLine,
  OcrQualityIssue,
  OcrQualitySignals,
  OcrResult,
  OcrStatus,
  ReadingApi,
  SeenThing,
  ThingsResult,
} from './src/types';
export { orderLines } from './src/order-lines';
export { classifyQuality, QUALITY_THRESHOLDS } from './src/quality';

/** Below this mean grey level a photo is too dark to trust what was found in it. */
export const TOO_DARK_BELOW = 0.12;

/** A signal the device did not report stays NaN, which never raises a quality issue. */
const signal = (value: unknown): number => (typeof value === 'number' ? value : Number.NaN);

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

function toBox(bbox: readonly number[]): OcrBox {
  const [x = 0, y = 0, w = 0, h = 0] = bbox;
  return [x, y, w, h];
}

/** A box held inside the photo, so a ring drawn from it never leaves the picture. */
function insideBox(bbox: readonly number[]): OcrBox {
  const x = clamp01(bbox[0] ?? 0);
  const y = clamp01(bbox[1] ?? 0);
  return [x, y, Math.min(clamp01(bbox[2] ?? 0), 1 - x), Math.min(clamp01(bbox[3] ?? 0), 1 - y)];
}

/** `coffee_cup` → `coffee cup`; blanks and repeats dropped. */
function plainLabels(labels: readonly string[]): string[] {
  const plain = labels.map((label) => label.replaceAll('_', ' ').trim().toLowerCase());
  return [...new Set(plain.filter((label) => label.length > 0))];
}

export function fromNativeModule(native: NativeScootchReadingModule): ReadingApi {
  return {
    async recognizeText(imageUri, options) {
      const languages = [...new Set(options?.languages ?? [])];
      const raw = await native.recognizeText(imageUri, languages);
      const signals = {
        blur: signal(raw.signals.blur),
        glare: signal(raw.signals.glare),
        curvature: signal(raw.signals.curvature),
        clipped: signal(raw.signals.clipped),
      };
      const lines = orderLines(
        raw.observations.map((o): RawOcrLine => ({
          text: o.text,
          bbox: toBox(o.bbox),
          conf: o.conf,
        })),
      );
      return {
        status: lines.length > 0 ? 'ok' : 'no_text',
        lines,
        signals,
        quality: classifyQuality(signals),
        width: raw.width,
        height: raw.height,
      };
    },
    async findThings(imageUri) {
      const raw = await native.findThings(imageUri);
      const things = raw.things
        .map((thing) => ({ box: insideBox(thing.bbox), labels: plainLabels(thing.labels) }))
        .filter(({ box }) => box[2] > 0 && box[3] > 0)
        .map((thing, index) => ({ id: `t${index}`, ...thing }));
      const brightness = signal(raw.brightness);
      return {
        things,
        tooDark: Number.isFinite(brightness) && brightness < TOO_DARK_BELOW,
        width: raw.width,
        height: raw.height,
      };
    },
  };
}

let shared: ReadingApi | null = null;

/** Null in a build without the native module: there is then no camera button. */
export function getReading(): ReadingApi | null {
  if (nativeScootchReadingModule === null) return null;
  shared ??= fromNativeModule(nativeScootchReadingModule);
  return shared;
}
