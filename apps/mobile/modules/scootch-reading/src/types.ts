export type OcrStatus = 'ok' | 'no_text';

export type OcrQualityIssue = 'crumpled' | 'blurry' | 'glare' | 'cut_off';

export type OcrBox = readonly [x: number, y: number, w: number, h: number];

/**
 * One recognised line. `id` is `l{index}` in reading order (top to bottom, then left to right);
 * `bbox` is `[x, y, w, h]` normalised 0..1 with a top-left origin on the upright image.
 */
export interface OcrLine {
  readonly id: string;
  readonly text: string;
  readonly bbox: OcrBox;
  readonly conf: number;
}

/** A line as the recogniser reports it, before ordering. */
export interface RawOcrLine {
  text: string;
  bbox: OcrBox;
  conf: number;
}

/**
 * Raw image signals:
 * - `blur`: variance of the Laplacian of the downscaled grey image (0..255 grey levels); low is soft.
 * - `glare`: share of pixels blown out to near-white and clearly brighter than the paper (median).
 * - `curvature`: standard deviation, in degrees, of the baselines' angles across the long lines;
 *   a flat page reads as one angle (even when tilted), a crumpled or folded one does not.
 * - `clipped`: share of lines whose box touches an image edge.
 */
export interface OcrQualitySignals {
  readonly blur: number;
  readonly glare: number;
  readonly curvature: number;
  readonly clipped: number;
}

export interface OcrResult {
  readonly status: OcrStatus;
  readonly lines: readonly OcrLine[];
  readonly signals: OcrQualitySignals;
  readonly quality: OcrQualityIssue | null;
  /** The upright image the boxes refer to, in pixels. */
  readonly width: number;
  readonly height: number;
}

/** One separate thing in a photo. `id` is `t{index}` in the order found. */
export interface SeenThing {
  readonly id: string;
  readonly box: OcrBox;
  /** Lower-case words, best first; empty when the thing can be seen but not named. */
  readonly labels: readonly string[];
}

export interface ThingsResult {
  readonly things: readonly SeenThing[];
  /** Too little light to trust what was found: ask for more light before reading anything in. */
  readonly tooDark: boolean;
  readonly width: number;
  readonly height: number;
}

export interface ReadingApi {
  recognizeText(
    imageUri: string,
    options?: { readonly languages?: readonly string[] },
  ): Promise<OcrResult>;
  findThings(imageUri: string): Promise<ThingsResult>;
}
