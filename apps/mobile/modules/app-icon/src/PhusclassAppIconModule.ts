import { type NativeModule, requireOptionalNativeModule } from 'expo';

/** The Swift module (`ios/PhusclassAppIconModule.swift`). */
export declare class NativePhusclassAppIconModule extends NativeModule {
  supported(): boolean;
  /** The alternate icon's name, or `null` for the app's own icon. */
  current(): string | null;
  set(name: string | null): Promise<void>;
}

/** `null` on Android, in Jest and in a binary made before the module existed. */
export const nativePhusclassAppIconModule =
  requireOptionalNativeModule<NativePhusclassAppIconModule>('PhusclassAppIcon');
