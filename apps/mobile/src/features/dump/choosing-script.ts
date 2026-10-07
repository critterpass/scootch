/** What the choosing reveal plays: the words, in order, and which run of them is the one thing. */
export interface ChoosingScript {
  readonly words: readonly string[];
  /** The one thing is `words[from]` up to, not including, `words[to]`. Equal when none of it is there. */
  readonly from: number;
  readonly to: number;
}

export interface ChoosingSource {
  /** What the person said or typed, as it was sent; `null` when it is not known. */
  readonly sent: string | null;
  /** What the brain dump heard, when the words themselves are not at hand. */
  readonly heard: { readonly phrases: readonly string[]; readonly chosen: number } | null;
  readonly oneThing: string;
}

/** More words than this do not fit under Scootch: the reveal keeps the ones around the one thing. */
export const MOST_WORDS = 60;
/** A short typed thing that comes back reworded is still the person's one thing, whole. */
const SHORT_THING_WORDS = 12;

const split = (text: string): string[] => text.trim().split(/\s+/u).filter(Boolean);
const bare = (word: string): string =>
  word
    .normalize('NFC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * Where the one thing's words run, in order and unbroken, among what was sent: the first and the
 * last word of the run (`to` is one past it), or `null` when they do not. Tokens with no letter or
 * digit in them (a dash, an emoji) are skipped on both sides, so they never break a match.
 */
function runOf(
  words: readonly string[],
  thing: readonly string[],
): { readonly from: number; readonly to: number } | null {
  const want = thing.map(bare).filter(Boolean);
  if (want.length === 0) return null;
  const have = words.map((word, index) => ({ word: bare(word), index })).filter((it) => it.word);
  for (let start = 0; start + want.length <= have.length; start += 1) {
    if (want.every((word, offset) => have[start + offset]?.word === word)) {
      const first = have[start];
      const last = have[start + want.length - 1];
      if (first && last) return { from: first.index, to: last.index + 1 };
    }
  }
  return null;
}

/** Keeps at most `MOST_WORDS`, with the one thing in the middle of what is kept. */
function around(words: readonly string[], from: number, to: number): ChoosingScript {
  if (words.length <= MOST_WORDS) return { words, from, to };
  const spare = Math.max(0, MOST_WORDS - (to - from));
  const start = Math.min(Math.max(0, from - Math.floor(spare / 2)), words.length - MOST_WORDS);
  return {
    words: words.slice(start, start + MOST_WORDS),
    from: from - start,
    to: Math.min(to - start, MOST_WORDS),
  };
}

/**
 * The script of the reveal. The person's own words are played when the one thing is among them:
 * spoken or typed, online or not. When it came back reworded, a short typed thing is played whole
 * and a ramble is played from what was heard. With nothing of the one thing to show there is no
 * reveal (`null`), so words from some earlier send can never be played over a different task.
 */
export function choosingScript({ sent, heard, oneThing }: ChoosingSource): ChoosingScript | null {
  const thing = split(oneThing);
  const words = sent === null ? [] : split(sent);
  const run = runOf(words, thing);
  if (run !== null) return around(words, run.from, run.to);

  if (heard !== null && heard.phrases.length > 0) {
    const flat: string[] = [];
    let from = 0;
    let to = 0;
    heard.phrases.forEach((phrase, index) => {
      const part = split(phrase);
      if (index === heard.chosen) {
        from = flat.length;
        to = from + part.length;
      } else if (index < heard.phrases.length - 1 && part.length > 0) {
        part[part.length - 1] = `${part[part.length - 1]},`;
      }
      flat.push(...part);
    });
    return around(flat, from, to);
  }

  if (words.length === 0 || words.length > SHORT_THING_WORDS) return null;
  const kept = new Set(thing.map(bare).filter(Boolean));
  const said = words.map(bare).filter(Boolean);
  const shared = said.filter((word) => kept.has(word)).length;
  return said.length > 0 && shared * 2 >= said.length ? { words, from: 0, to: words.length } : null;
}

/** The board's timing, in milliseconds from the first word. */
export interface ChoosingTimeline {
  /** Each word arrives this long after the one before. */
  readonly step: number;
  /** The one thing lights up. */
  readonly lightAt: number;
  /** Everything else starts to blur, drift and fall. */
  readonly fallAt: number;
  /** The words fade and the one thing rises into its place as the headline. */
  readonly answerAt: number;
  readonly endAt: number;
}

const STEP_MS = 100;
/** The words never take longer than this to arrive, however many there are. */
const LONGEST_ARRIVAL_MS = 4500;
export const ARRIVE_FADE_MS = 700;
export const LIGHT_MS = 350;
export const FALL_SPREAD_MS = 380;
export const FALL_FADE_MS = 700;
export const FALL_MS = 900;
export const WORDS_OUT_MS = 500;
export const ANSWER_FADE_MS = 600;
export const ANSWER_RISE_MS = 700;
export const ANSWER_RISE = 14;
/** How long a lit one thing is held when no other word is there to fall. */
const NOTHING_FALLS_MS = 450;

/**
 * The beats for a script. When every word is the one thing there is nothing to watch fall, so the
 * answer follows the light directly instead of waiting out a fall that does not happen.
 */
export function choosingTimeline(words: number, others = true): ChoosingTimeline {
  const step = Math.min(STEP_MS, LONGEST_ARRIVAL_MS / Math.max(1, words));
  const lightAt = words * step + 500;
  const fallAt = lightAt + (others ? 900 : LIGHT_MS);
  const answerAt = fallAt + (others ? 1500 : NOTHING_FALLS_MS);
  return { step, lightAt, fallAt, answerAt, endAt: answerAt + ANSWER_RISE_MS };
}

/** The beats for one script: whether anything falls is read from the script itself. */
export function timelineOf(script: ChoosingScript | null): ChoosingTimeline {
  const count = script?.words.length ?? 0;
  return choosingTimeline(count, script !== null && script.to - script.from < count);
}

/** How long past the reveal's own end the dock may stay away before it shows regardless. */
const CAP_MARGIN_MS = 1500;

/**
 * The longest the one thing may be left without its dock. The reveal says when it is done; this
 * is the limit that holds even if it never does, so the dock can not stay hidden.
 */
export function revealCapMs(script: ChoosingScript | null): number {
  return script === null ? 0 : timelineOf(script).endAt + CAP_MARGIN_MS;
}

/** Whether the dock under the one thing shows: once the reveal is over, or the cap has passed. */
export function dockShows(playing: boolean, waitedMs: number, capMs: number): boolean {
  return !playing || waitedMs >= capMs;
}

/** How one word leaves: the same every time for the same place in the sentence. */
export interface WordFall {
  readonly delay: number;
  readonly dx: number;
  readonly dy: number;
  readonly turn: number;
}

function scatter(index: number, salt: number): number {
  const wave = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return wave - Math.floor(wave);
}

/** Sideways up to 20 points either way, down 120 to 280, turned up to 20 degrees, within 380 ms. */
export function wordFall(index: number): WordFall {
  return {
    delay: scatter(index, 1) * FALL_SPREAD_MS,
    dx: (scatter(index, 2) - 0.5) * 40,
    dy: 120 + scatter(index, 3) * 160,
    turn: (scatter(index, 4) - 0.5) * 40,
  };
}
