import { type NativeModule, requireOptionalNativeModule } from 'expo';

export type NativeMicPermission = 'granted' | 'denied' | 'undetermined';

/** The Swift module (`ios/PhusclassMicModule.swift`). */
export declare class NativePhusclassMicModule extends NativeModule<{
  /** 100 ms of 16 kHz mono 16-bit PCM, base64. */
  onAudio: (event: { readonly chunk: string }) => void;
  /** How loud the voice is, 0 to 1, the loudest moment since the last one. */
  onLevel: (event: { readonly level: number }) => void;
  /** iOS took the microphone away (a call, Siri, another app, a headset change). */
  onStop: (event: { readonly reason: 'interrupted' }) => void;
}> {
  permission(): Promise<NativeMicPermission>;
  /** Shows the system's question; true when the microphone is allowed. */
  ask(): Promise<boolean>;
  /** Starts the microphone; rejects when it cannot. Permission is asked for first. */
  start(): Promise<void>;
  /** Stops it; what is left arrives as one last `onAudio`. */
  stop(): Promise<void>;
}

/** `null` on Android, in Jest and in a binary made before the module existed. */
export const nativePhusclassMicModule =
  requireOptionalNativeModule<NativePhusclassMicModule>('PhusclassMic');
