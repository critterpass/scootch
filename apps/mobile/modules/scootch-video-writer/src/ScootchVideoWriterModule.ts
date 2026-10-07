import { type NativeModule, requireOptionalNativeModule } from 'expo';

/** The Swift module (`ios/ScootchVideoWriterModule.swift`). */
export declare class NativeScootchVideoWriterModule extends NativeModule {
  writeVideo(frameUris: string[], framesPerSecond: number, outputUri: string): Promise<string>;
}

/** `null` on Android, in Jest and in a binary made before the module existed. */
export const nativeScootchVideoWriterModule =
  requireOptionalNativeModule<NativeScootchVideoWriterModule>('ScootchVideoWriter');
