import { type NativeModule, requireOptionalNativeModule } from 'expo';

/** The Swift module (`ios/PhusclassIntelligenceModule.swift`). */
export declare class NativePhusclassIntelligenceModule extends NativeModule {
  isAvailable(): boolean;
  splitTasks(text: string, lang: string): Promise<string[] | null>;
  screenHint(text: string, lang: string): Promise<string | null>;
}

/** `null` on Android, in Jest and in a binary made before the module existed. */
export const nativePhusclassIntelligenceModule =
  requireOptionalNativeModule<NativePhusclassIntelligenceModule>('PhusclassIntelligence');
