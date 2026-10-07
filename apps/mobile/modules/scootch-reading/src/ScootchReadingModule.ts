import { type NativeModule, requireOptionalNativeModule } from 'expo';

import type { OcrQualitySignals } from './types';

/** One line as Vision reports it (`bbox` normalised, top-left origin). */
export interface NativeOcrObservation {
  readonly text: string;
  readonly bbox: readonly number[];
  readonly conf: number;
}

export interface NativeRecognition {
  readonly observations: readonly NativeOcrObservation[];
  readonly signals: OcrQualitySignals;
  readonly width: number;
  readonly height: number;
}

export interface NativeThing {
  readonly bbox: readonly number[];
  /** Vision's classifier identifiers, best first, such as `coffee_cup`. */
  readonly labels: readonly string[];
}

export interface NativeThings {
  readonly things: readonly NativeThing[];
  /** Mean grey level, 0 to 1; not a number when it could not be measured. */
  readonly brightness: number;
  readonly width: number;
  readonly height: number;
}

/** The Swift module (`ios/ScootchReadingModule.swift`). */
export declare class NativeScootchReadingModule extends NativeModule {
  recognizeText(uri: string, languages: readonly string[]): Promise<NativeRecognition>;
  findThings(uri: string): Promise<NativeThings>;
}

/**
 * `null` in a build without the module (Jest, Android, or a binary built before it existed): the
 * app then shows no camera button at all.
 */
export const nativeScootchReadingModule =
  requireOptionalNativeModule<NativeScootchReadingModule>('ScootchReading');
