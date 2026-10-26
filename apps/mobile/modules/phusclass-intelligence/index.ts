import {
  nativePhusclassIntelligenceModule,
  type NativePhusclassIntelligenceModule,
} from './src/PhusclassIntelligenceModule';

/** The languages the app is written in. */
export type IntelligenceLanguage = 'en' | 'vi';

/** What the model may say about a task's weight. It only ever adds caution to the rules. */
export type ScreenHint = 'none' | 'serious' | 'crisis';

const HINTS: readonly string[] = ['none', 'serious', 'crisis'];

/**
 * Apple's on-device model, on iOS 26 and later with Apple Intelligence on. Everywhere else, and
 * on any failure, every call answers "not there" (`false` or `null`) and the rules on the phone
 * do the job alone. Pass `native` only in a test.
 */
export function createIntelligence(
  native: Pick<
    NativePhusclassIntelligenceModule,
    'isAvailable' | 'splitTasks' | 'screenHint'
  > | null = nativePhusclassIntelligenceModule,
) {
  return {
    isAvailable: (): boolean => {
      try {
        return native?.isAvailable() ?? false;
      } catch {
        return false;
      }
    },

    /** A ramble as tasks in the speaker's words, or `null` when the model cannot say. */
    splitTasks: async (text: string, lang: IntelligenceLanguage): Promise<string[] | null> => {
      if (native === null || text.trim() === '') return null;
      try {
        const tasks = await native.splitTasks(text, lang);
        if (!Array.isArray(tasks)) return null;
        const kept = tasks.filter(
          (one): one is string => typeof one === 'string' && one.trim() !== '',
        );
        return kept.length > 0 ? kept : null;
      } catch {
        return null;
      }
    },

    /** How heavy a task reads to the model, or `null` when it cannot say. */
    screenHint: async (text: string, lang: IntelligenceLanguage): Promise<ScreenHint | null> => {
      if (native === null || text.trim() === '') return null;
      try {
        const hint = await native.screenHint(text, lang);
        return hint !== null && HINTS.includes(hint) ? (hint as ScreenHint) : null;
      } catch {
        return null;
      }
    },
  };
}

export type Intelligence = ReturnType<typeof createIntelligence>;

const intelligence = createIntelligence();

export const isAvailable = intelligence.isAvailable;
export const splitTasks = intelligence.splitTasks;
export const screenHint = intelligence.screenHint;
