import {
  nativePhusclassMicModule as native,
  type NativeMicPermission,
  type NativePhusclassMicModule,
} from './src/PhusclassMicModule';

export type { NativeMicPermission as MicPermission } from './src/PhusclassMicModule';

/** The microphone while a task is said. Every listener returns the way to stop listening. */
export interface Mic {
  permission(): Promise<NativeMicPermission>;
  ask(): Promise<boolean>;
  start(): Promise<void>;
  stop(): Promise<void>;
  onAudio(listener: (chunk: string) => void): () => void;
  onLevel(listener: (level: number) => void): () => void;
  onStop(listener: () => void): () => void;
}

function wrap(module: NativePhusclassMicModule): Mic {
  return {
    permission: () => module.permission(),
    ask: () => module.ask(),
    start: () => module.start(),
    stop: () => module.stop(),
    onAudio: (listener) => {
      const subscription = module.addListener('onAudio', ({ chunk }) => listener(chunk));
      return () => subscription.remove();
    },
    onLevel: (listener) => {
      const subscription = module.addListener('onLevel', ({ level }) => listener(level));
      return () => subscription.remove();
    },
    onStop: (listener) => {
      const subscription = module.addListener('onStop', () => listener());
      return () => subscription.remove();
    },
  };
}

/**
 * The microphone as 16 kHz mono PCM chunks with its level (`ios/PhusclassMicModule.swift`), or
 * null where it is not built in: Android, tests, and a binary made before the module existed.
 */
export const mic: Mic | null = native === null ? null : wrap(native);
