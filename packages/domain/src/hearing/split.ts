import { mentionsDate } from './find-date';
import { mentionsTime } from './heard-times';
import {
  englishLeads,
  englishOpeners,
  englishVerbs,
  vietnameseLeadSource,
  vietnameseOpeners,
  vietnameseOpenersMarked,
  vietnameseVerbs,
  vietnameseVerbsMarkedOnly,
} from './split-words';
import { foldMarks, hasMarks, tidy } from './text';

/**
 * Splitting a ramble into tasks on the phone, in English and Vietnamese. The rules split only
 * where they are sure a new task starts: at the end of a sentence, or at a comma or a joining
 * word ("and", "then", "và", "rồi") followed by a word that starts a task ("call", "I need to",
 * "phải", "gọi"). Everything else stays together, so "milk, eggs and bread" is one task.
 */

/** Words that join two tasks in one sentence. A cut is made at one only if a task follows. */
const joinSource =
  ',\\s+|\\s+(?:and then|and also|oh and|and|then|also|plus|after that|xong rồi|sau đó|với lại|với cả|và|rồi|xong)\\s+';
/** "còn" joins only when it is written with its mark: "con" is a child. */
const joinMarkedSource = '\\s+còn\\s+';

/** Whole parts that are a feeling, not a task. Dropped when other tasks were heard. */
const feelingSource =
  "^(?:i'?m|i am|i feel|feeling|so tired|so stressed|mệt quá|chán quá|buồn quá|lười quá|trời ơi|haizz?|huhu)(?:\\s|$)";

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wordsPattern(words: readonly string[]): string {
  return [...words]
    .sort((a, b) => b.length - a.length)
    .map((word) => escape(word).replace(/ /g, '\\s+'))
    .join('|');
}

type Rules = {
  readonly join: RegExp;
  readonly openers: RegExp;
  readonly leads: RegExp;
  readonly verbs: RegExp;
  readonly feeling: RegExp;
  readonly closers: RegExp;
  readonly dayWords: RegExp;
};

const EDGE_END = '(?![\\p{L}\\p{N}])';

function rulesFor(marked: boolean): Rules {
  const vi = (source: string) => (marked ? source : foldMarks(source));
  const english = (source: string) => source;
  return {
    join: new RegExp(marked ? `${joinSource}|${joinMarkedSource}` : vi(joinSource), 'giu'),
    openers: new RegExp(
      `^(?:(?:${english(wordsPattern(englishOpeners))}|${vi(wordsPattern(marked ? [...vietnameseOpeners, ...vietnameseOpenersMarked] : vietnameseOpeners))})${EDGE_END}[\\s,]*)+`,
      'iu',
    ),
    leads: new RegExp(
      `^(?:${english(wordsPattern(englishLeads))}|${vi(vietnameseLeadSource)})${EDGE_END}\\s*`,
      'iu',
    ),
    verbs: new RegExp(
      `^(?:${wordsPattern([...englishVerbs])}|${vi(wordsPattern(marked ? vietnameseVerbs : vietnameseVerbs.filter((verb) => !vietnameseVerbsMarkedOnly.has(verb))))})${EDGE_END}`,
      'iu',
    ),
    feeling: new RegExp(vi(feelingSource), 'iu'),
    closers: new RegExp(
      `(?:[\\s,]+(?:too|as well|also|please|${marked ? 'nữa|luôn|nhé|nha|nhá|đi|ạ|á|với|cái đã' : 'nua|luon|nhe|nha|cai da'}))+$`,
      'iu',
    ),
    dayWords: new RegExp(
      `^(?:(?:today|tonight|tomorrow|later|this (?:morning|afternoon|evening)|(?:on |by )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|${vi('thứ (?:hai|ba|tư|năm|sáu|bảy|[2-7])(?: tuần (?:này|sau|tới))?|chủ nhật|cuối tuần(?: này| sau)?|hôm nay|tối nay|chiều nay|sáng nay|trưa nay|ngày mai|sáng mai|chiều mai|tối mai|mai|mốt|lát nữa|lát|trước tiên|đầu tiên|trước hết')})${EDGE_END}[\\s,]*)+`,
      'iu',
    ),
  };
}

const marked = rulesFor(true);
const unmarked = rulesFor(false);

/** The front of a part with openers, day words and the subject taken off. */
function frontOf(part: string, rules: Rules): string {
  let rest = part.replace(rules.openers, '');
  rest = rest.replace(rules.dayWords, '');
  rest = rest.replace(rules.openers, '');
  return rest;
}

/** Whether a part starts a task: a lead ("I need to", "phải") or a verb, after the openers. */
function startsTask(part: string, rules: Rules): boolean {
  const front = frontOf(part, rules);
  return rules.leads.test(front) || rules.verbs.test(front);
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/** Abbreviations whose full stop does not end a sentence. */
const abbreviations = /(?:^|\s)(?:mr|mrs|ms|dr|st|vs|etc|e\.g|i\.e|a\.m|p\.m|approx|tp)$/i;

/** The sentences of a ramble, split at . ! ? ; … and new lines, but not inside 3.5 or "Dr.". */
export function sentencesOf(text: string): string[] {
  const source = text.normalize('NFC').replace(/[‘’]/g, "'");
  const sentences: string[] = [];
  let start = 0;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? '';
    const next = source[index + 1] ?? '';
    if (
      character === '\n' ||
      character === '…' ||
      character === ';' ||
      character === '!' ||
      character === '?'
    ) {
      sentences.push(source.slice(start, index));
      start = index + 1;
      continue;
    }
    if (character === '.' && (next === '' || /\s/.test(next))) {
      const before = source.slice(start, index);
      if (abbreviations.test(before)) continue;
      sentences.push(before);
      start = index + 1;
    }
  }
  sentences.push(source.slice(start));
  return sentences
    .map((sentence) => tidy(sentence))
    .filter((sentence) => /[\p{L}\p{N}]/u.test(sentence));
}

/** A part that points back at the one before it: "it's due Friday" belongs to its task. */
const refersBack =
  /^(?:it|it's|its|that|that's|which|this|they're|they are|due|nó|cái này|cái đó|hạn|hạn là|no|cai nay|cai do|han)(?![\p{L}\p{N}])/iu;

/** Cuts one sentence where a new task starts. */
function clausesOf(sentence: string, rules: Rules): string[] {
  const cuts: { at: number; after: number }[] = [];
  rules.join.lastIndex = 0;
  for (const match of sentence.matchAll(rules.join)) {
    cuts.push({ at: match.index, after: match.index + match[0].length });
  }
  const parts: string[] = [];
  let start = 0;
  for (const [index, cut] of cuts.entries()) {
    if (cut.at < start) continue;
    const left = sentence.slice(start, cut.at).trim();
    const right = sentence.slice(cut.after);
    // After a comma or a "then", a part with its own day or time is its own task: "…by Friday,
    // the dentist at three".
    const upToNext = sentence.slice(cut.after, cuts[index + 1]?.at ?? sentence.length);
    const ownWhen =
      /^(?:,|\s+(?:and then|then|after that|rồi|sau đó|roi|sau do)\s)/u.test(
        sentence.slice(cut.at, cut.after),
      ) &&
      !refersBack.test(upToNext) &&
      (mentionsTime(upToNext) || mentionsDate(upToNext));
    if (left === '' || !(startsTask(right, rules) || ownWhen)) continue;
    // "Clean and tidy the room" is one task: a single word on the left is not a task of its own.
    if (wordCount(frontOf(left, rules)) < 2 && !rules.leads.test(frontOf(left, rules))) continue;
    parts.push(left);
    start = cut.after;
  }
  parts.push(sentence.slice(start).trim());
  return parts.filter((part) => part !== '');
}

/** A part tidied into a task: openers, leads and closers off, the first letter raised. */
export function cleanTask(part: string): string {
  const rules = hasMarks(part.toLowerCase()) ? marked : unmarked;
  let text = tidy(part).replace(/^[\s,.;:!?"'-]+|[\s,.;:!?"'-]+$/g, '');
  for (let pass = 0; pass < 3; pass += 1) {
    const before = text;
    text = text.replace(rules.openers, '').replace(rules.leads, '').replace(rules.closers, '');
    text = text.replace(/^[\s,.;:!?"'-]+|[\s,.;:!?"'-]+$/g, '');
    if (text === before) break;
  }
  if (text === '') return '';
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

function isFeeling(part: string, rules: Rules): boolean {
  const front = part.replace(rules.openers, '');
  return rules.feeling.test(front) && !startsTask(front.replace(rules.feeling, ''), rules);
}

/** A part with no letters left after its openers: "um", "okay so", "à". */
function isFiller(part: string, rules: Rules): boolean {
  return !/[\p{L}\p{N}]/u.test(part.replace(rules.openers, '').replace(rules.closers, ''));
}

export type SplitRamble = {
  /** Each part as the user said it, in order. */
  readonly parts: readonly string[];
  /**
   * `split`: cut where new tasks start, with filler and feelings left out.
   * `sentences`: nothing looked like a task, so every sentence is kept as said (filler aside).
   */
  readonly how: 'split' | 'sentences';
};

/**
 * A ramble cut into the parts that are tasks. Nothing is ever lost: when no part looks like a
 * task, every sentence comes back as said (brief 9). The same part said twice is kept once.
 */
export function splitRamble(text: string): SplitRamble {
  const sentences = sentencesOf(text);
  const parts: string[] = [];
  let anyTask = false;
  for (const sentence of sentences) {
    const rules = hasMarks(sentence.toLowerCase()) ? marked : unmarked;
    for (const part of clausesOf(sentence, rules)) {
      if (isFiller(part, rules)) continue;
      if (isFeeling(part, rules)) continue;
      if (startsTask(part, rules)) anyTask = true;
      parts.push(part);
    }
  }
  const unique = (list: readonly string[]) => {
    const seen = new Set<string>();
    return list.filter((part) => {
      const key = foldMarks(cleanTask(part).toLowerCase());
      if (key === '' || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  if (anyTask) return { parts: unique(parts), how: 'split' };
  const said = sentences.filter((sentence) => {
    const rules = hasMarks(sentence.toLowerCase()) ? marked : unmarked;
    return !isFiller(sentence, rules);
  });
  return { parts: unique(said), how: 'sentences' };
}
