import { type NativeModule, requireOptionalNativeModule } from 'expo';

/** What the Swift module sends (`ios/HingeWatcher.swift`). */
export interface NativeFoldReading {
  readonly status: 'none' | 'unknown' | 'closed' | 'partial' | 'open';
  readonly angle: number;
  readonly division?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

/** The Swift module (`ios/PhusclassFoldModule.swift`). */
export declare class NativePhusclassFoldModule extends NativeModule<{
  onFold: (reading: NativeFoldReading) => void;
}> {
  current(): NativeFoldReading | null;
}

/** `null` on Android, in Jest and in a binary made before the module existed. */
export const nativePhusclassFoldModule =
  requireOptionalNativeModule<NativePhusclassFoldModule>('PhusclassFold');
