import { SHORT_NAME_MOST } from '../board/short-name-words';

import { hear, hearTask, type HeardTask, type HearingClock } from './hear';
import { asOneThought, cleanTask } from './split';
import { endsDangling } from './spoken';
import { stripMarks, wordsOf } from './text';

/**
 * Splits a ramble into tasks with an on-device model: each task in the speaker's words, or `null`
 * when the model is not there or cannot say. It may also reject; that is the same as `null`.
 */
export type ModelSplit = (ramble: string) => Promise<readonly string[] | null>;

/** One task the server's model heard: the task in the speaker's words, and its chalk name. */
export type HeardPart = { readonly text: string; readonly short: string | null };

/**
 * Splits an utterance into tasks with the server's model, with a chalk name for each, or `null`
 * when there is no connection or no answer. It may also reject; that is the same as `null`.
 */
export type OnlineSplit = (utterance: string) => Promise<readonly HeardPart[] | null>;

/** The longest the model is waited on before the rules' hearing is used instead. */
export const MODEL_WAIT_MS = 1500;
/** A ramble shorter than this is one task said plainly: the rules hear it at once. */
export const MODEL_MIN_WORDS = 8;
/** The most tasks a model's split may have; more and the rules' hearing is used. */
export const MODEL_MOST_TASKS = 20;
/**
 * The longest the server's model is waited on. It answers in one to three seconds; the words
 * are on show for part of that, and past this the rules hear it.
 */
export const ONLINE_WAIT_MS = 4000;
/** Fewer words than this is said plainly ("call mum"): the rules hear it at once. */
export const ONLINE_MIN_WORDS = 3;
/** The most words a chalk name from the model may have. */
const SHORT_MOST_WORDS = 5;

export type ModelHearing = {
  readonly tasks: readonly HeardTask[];
  /**
   * `model`: the on-device model's split; `online`: the server's. Either way each part is read by
   * the rules for its day and time.
   */
  readonly how: 'split' | 'sentences' | 'model' | 'online';
};

export type ModelHearingOptions = {
  readonly split?: ModelSplit | undefined;
  readonly waitMs?: number;
  readonly online?: OnlineSplit | undefined;
  readonly onlineWaitMs?: number;
};

const folded = (text: string) => wordsOf(stripMarks(text));

const ARTICLES = new Set(['the', 'a', 'an']);

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
 * Whether a word was said: as it was, or as the start of a word said ("eval" for "evaluation"),
 * or with a different ending on the same stem ("evaluate" for "evaluation").
 */
function wasSaid(word: string, said: ReadonlySet<string>): boolean {
  if (said.has(word)) return true;
  for (const one of said) {
    if (word.length >= 3 && one.startsWith(word)) return true;
    if (word.length >= 5 && one.length >= 5) {
      let same = 0;
      while (same < word.length && word[same] === one[same]) same += 1;
      if (same >= 5 && same >= Math.min(word.length, one.length) - 3) return true;
    }
  }
  return false;
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
    // An article put back where it was dropped invents nothing.
    const words = folded(part).filter((word) => !ARTICLES.has(word));
    if (words.length === 0) return false;
    const heard = words.filter((word) => wasSaid(word, said)).length;
    if (heard / words.length < 0.9) return false;
    for (const word of words) kept.add(word);
  }
  return rulesHeard.every((task) => {
    // The task's own words: the fillers and false starts the rules took off need not be kept.
    const words = folded(task.text);
    if (words.length === 0) return true;
    return words.filter((word) => wasSaid(word, kept)).length / words.length >= 0.5;
  });
}

/**
 * A chalk name from the model, kept only when it reads as a task and says nothing that was not
 * said: short, every word said (or the start of one), never only filler, and never ending on a
 * word that needs more ("We need", "Mình cần").
 */
export function acceptedShort(short: string | null, utterance: string): string | null {
  if (short === null) return null;
  const name = short.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name === '' || name.length > SHORT_NAME_MOST) return null;
  const words = folded(name);
  if (words.length === 0 || words.length > SHORT_MOST_WORDS) return null;
  const said = new Set(folded(utterance));
  if (!words.every((word) => wasSaid(word, said))) return null;
  if (cleanTask(name) === '' || endsDangling(name)) return null;
  return name.charAt(0).toLocaleUpperCase() + name.slice(1);
}

/** A model's parts as the board's tasks, or `null` when they cannot stand in for the rules'. */
function heardFrom(
  ramble: string,
  parts: readonly HeardPart[],
  rules: readonly HeardTask[],
  clock: HearingClock,
): HeardTask[] | null {
  const cleaned = parts
    .map((part) => ({ text: part.text.trim(), short: part.short }))
    .filter((part) => part.text !== '');
  if (
    !acceptsModelSplit(
      ramble,
      cleaned.map((part) => part.text),
      rules,
    )
  ) {
    return null;
  }
  const seen = new Set<string>();
  const tasks = cleaned
    .map((part) => ({
      ...hearTask(asOneThought(part.text), clock),
      short: acceptedShort(part.short, ramble),
    }))
    .filter((task) => {
      const key = folded(task.text).join(' ');
      if (key === '' || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return tasks.length === 0 ? null : tasks;
}

/**
 * Hears an utterance with a model as an optional first pass: the server's model when there is a
 * connection, then the on-device model. The rules always hear it too, and are what the board gets
 * when there is no model, when it is slower than its wait, when it fails, or when its split would
 * invent or lose something. Each of a model's parts is still read by the rules for its day and
 * time; a chalk name from the server's model is kept only when it passes `acceptedShort`.
 */
export async function hearWithModel(
  ramble: string,
  clock: HearingClock,
  options: ModelHearingOptions = {},
): Promise<ModelHearing> {
  const rules = hear(ramble, clock);
  const words = folded(ramble).length;
  if (options.online !== undefined && words >= ONLINE_MIN_WORDS) {
    const parts = await within(options.online(ramble), options.onlineWaitMs ?? ONLINE_WAIT_MS);
    const tasks = parts === null ? null : heardFrom(ramble, parts, rules.tasks, clock);
    if (tasks !== null) return { tasks, how: 'online' };
  }
  if (options.split === undefined || words < MODEL_MIN_WORDS) return rules;
  const parts = await within(options.split(ramble), options.waitMs ?? MODEL_WAIT_MS);
  if (parts === null) return rules;
  const tasks = heardFrom(
    ramble,
    parts.map((text) => ({ text, short: null })),
    rules.tasks,
    clock,
  );
  return tasks === null ? rules : { tasks, how: 'model' };
}
