import { hear, hearTask, type HeardTask, type HearingClock } from './hear';
import { stripMarks, wordsOf } from './text';

/**
 * Splits a ramble into tasks with an on-device model: each task in the speaker's words, or `null`
 * when the model is not there or cannot say. It may also reject; that is the same as `null`.
 */
export type ModelSplit = (ramble: string) => Promise<readonly string[] | null>;

/** The longest the model is waited on before the rules' hearing is used instead. */
export const MODEL_WAIT_MS = 1500;
/** A ramble shorter than this is one task said plainly: the rules hear it at once. */
export const MODEL_MIN_WORDS = 8;
/** The most tasks a model's split may have; more and the rules' hearing is used. */
export const MODEL_MOST_TASKS = 20;

export type ModelHearing = {
  readonly tasks: readonly HeardTask[];
  /** `model`: the model's split, each part read by the rules for its day and time. */
  readonly how: 'split' | 'sentences' | 'model';
};

export type ModelHearingOptions = {
  readonly split?: ModelSplit | undefined;
  readonly waitMs?: number;
};

const folded = (text: string) => wordsOf(stripMarks(text));

/** The host's timers. The domain carries no platform types, so they are named here. */
type Timers = {
  setTimeout(run: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
};
const timers = globalThis as unknown as Timers;

/** The model's answer, or `null` once `ms` have passed or when it fails. */
function within<T>(work: Promise<T | null>, ms: number): Promise<T | null> {
  let timer: unknown;
  const late = new Promise<null>((resolve) => {
    timer = timers.setTimeout(() => resolve(null), ms);
  });
  return Promise.race([work.catch(() => null), late]).finally(() => timers.clearTimeout(timer));
}

/**
 * Whether a model's split can stand in for the rules': it invents nothing (almost every word of
 * every part was said), and it loses nothing the rules would have put on the board (each task
 * the rules heard is mostly there). A ramble is never lost to a model.
 */
export function acceptsModelSplit(
  ramble: string,
  parts: readonly string[],
  rulesHeard: readonly HeardTask[],
): boolean {
  if (parts.length === 0 || parts.length > MODEL_MOST_TASKS) return false;
  const said = new Set(folded(ramble));
  const kept = new Set<string>();
  for (const part of parts) {
    const words = folded(part);
    if (words.length === 0) return false;
    const heard = words.filter((word) => said.has(word)).length;
    if (heard / words.length < 0.9) return false;
    for (const word of words) kept.add(word);
  }
  return rulesHeard.every((task) => {
    const words = folded(task.said);
    if (words.length === 0) return true;
    return words.filter((word) => kept.has(word)).length / words.length >= 0.5;
  });
}

/**
 * Hears a ramble with the on-device model as an optional first pass. The rules always hear it
 * too, and are what the board gets when there is no model, when it is slower than `waitMs`, when
 * it fails, or when its split would invent or lose something. Each of the model's parts is still
 * read by the rules for its day and time.
 */
export async function hearWithModel(
  ramble: string,
  clock: HearingClock,
  options: ModelHearingOptions = {},
): Promise<ModelHearing> {
  const rules = hear(ramble, clock);
  if (options.split === undefined || folded(ramble).length < MODEL_MIN_WORDS) return rules;
  const parts = await within(options.split(ramble), options.waitMs ?? MODEL_WAIT_MS);
  if (parts === null) return rules;
  const cleaned = parts.map((part) => part.trim()).filter((part) => part !== '');
  if (!acceptsModelSplit(ramble, cleaned, rules.tasks)) return rules;
  const seen = new Set<string>();
  const tasks = cleaned
    .map((part) => hearTask(part, clock))
    .filter((task) => {
      const key = folded(task.text).join(' ');
      if (key === '' || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return tasks.length === 0 ? rules : { tasks, how: 'model' };
}
