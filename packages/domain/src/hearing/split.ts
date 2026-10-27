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
import {
  endsDangling,
  joinerStart,
  joinerStartFolded,
  refersBack,
  startsContinuing,
  withoutHesitation,
} from './spoken';
import { foldMarks, hasMarks, tidy } from './text';

/**
 * Splitting what was said into tasks on the phone, in English and Vietnamese. One hold to talk
 * is one utterance, and the rules split it only where they are sure a new task starts: at a comma,
 * a full stop or a joining word ("and", "then", "và", "rồi") followed by a word that starts a task
 * ("call", "I need to", "phải", "gọi"), after a joining word that opens a sentence ("Also…",
 * "Với lại…"), at a new line, or between three or more short things said one by one. A pause is
 * never a cut. Everything else stays together, so "milk, eggs and bread" is one task, and so is
 * "Uhm. We need… Evaluation for Gemini replacement."
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
      `(?:[\\s,]+(?:too|as well|also|please|you know|i guess|or something|and stuff|${marked ? 'nữa|luôn|nhé|nha|nhá|đi|ạ|á|với|cái đã|đấy|nhỉ' : 'nua|luon|nhe|nha|cai da'}))+$`,
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

/** A part with no task left once its openers, leads and closers are off: "uhm", "we need". */
function isEmpty(text: string): boolean {
  return cleanTask(text) === '';
}

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
    // A false start is not a task: "I need to, I need to call the bank"; "so the thing is, …".
    if (isEmpty(left) || endsDangling(left)) continue;
    parts.push(left);
    start = cut.after;
  }
  parts.push(sentence.slice(start).trim());
  return parts.filter((part) => part !== '');
}

/** How two sentences said one after the other meet. */
type Meeting = 'cut' | 'run on' | 'aside' | 'sentence';

/**
 * Whether a pause or a full stop between two sentences starts a new task. Only a clear sign
 * does: a joining word ("also", "then", "với lại"), a new task's own start ("call", "I need to",
 * "phải"), or a new day or time with words of its own. A thought that cannot end where it
 * stopped, or one that carries on ("for Sarah", "trước thứ Sáu", "it's due Friday"), runs on.
 * Anything else is the same task, said in two sentences.
 */
function meeting(left: string, right: string): Meeting {
  const rules = hasMarks(right.toLowerCase()) ? marked : unmarked;
  if (endsDangling(left) || startsContinuing(right)) return 'run on';
  const front = withoutHesitation(right);
  if (refersBack.test(front)) return 'aside';
  // Only a day or a time: "Tomorrow." belongs to what came before.
  if (!/[\p{L}\p{N}]/u.test(frontOf(front, rules))) return 'run on';
  const joiner = hasMarks(front.toLowerCase()) ? joinerStart : joinerStartFolded;
  const afterJoiner = front.replace(joiner, '');
  if (afterJoiner !== front && afterJoiner !== '') {
    if (startsContinuing(afterJoiner) || refersBack.test(afterJoiner)) return 'run on';
    return 'cut';
  }
  if (startsTask(front, rules)) return 'cut';
  const when = mentionsTime(front) || mentionsDate(front);
  if (when && wordCount(frontOf(front, rules)) >= 2) return 'cut';
  return 'sentence';
}

const trailingStop = /[\s.…,;:!?]+$/u;

/** Two sentences as one: the pause between them kept as a space, a comma or a full stop. */
function joined(left: string, right: string, how: Exclude<Meeting, 'cut'>): string {
  const before = left.replace(trailingStop, '');
  if (how === 'sentence') return `${before}. ${right}`;
  const first = right.match(/^[\p{L}']+/u)?.[0] ?? '';
  // "For Sarah" and "It's due" read on in lower case; a name or "I" keeps its capital.
  const lower =
    first !== '' && first !== 'I' && (startsContinuing(right) || refersBack.test(right))
      ? right.charAt(0).toLocaleLowerCase() + right.slice(1)
      : right;
  return how === 'aside' ? `${before}, ${lower}` : `${before} ${lower}`;
}

/**
 * Three or more things said one by one, each a task of its own or a short thing: "Laundry.
 * Dishes. Bins.", "Email the dentist. Renew passport. Tax receipts."
 */
function isList(sentences: readonly string[]): boolean {
  return (
    sentences.length >= 3 &&
    sentences.every((sentence) => {
      const rules = hasMarks(sentence.toLowerCase()) ? marked : unmarked;
      const short = wordCount(cleanTask(sentence)) <= 3;
      return (
        (short || startsTask(withoutHesitation(sentence), rules)) &&
        !endsDangling(sentence) &&
        !startsContinuing(sentence) &&
        !refersBack.test(withoutHesitation(sentence))
      );
    })
  );
}

/**
 * The sentences of one stretch of speech, put back together where they were one thought. A pause
 * is never a reason to cut: Scribe ends every phrase it settles after a pause with a full stop or
 * trailing dots, so "Uhm." "We need…" "Evaluation for Gemini replacement." is one task.
 */
function thoughtsOf(block: string): string[] {
  const sentences = sentencesOf(block).filter((sentence) => !isEmpty(sentence));
  if (isList(sentences)) return sentences;
  const thoughts: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current === '') {
      current = sentence;
      continue;
    }
    const how = meeting(current, sentence);
    if (how === 'cut') {
      thoughts.push(current);
      current = sentence;
    } else current = joined(current, sentence, how);
  }
  if (current !== '') thoughts.push(current);
  return thoughts;
}

/**
 * A part a model already chose, as one thought: its sentences joined up as the rules would join
 * them, never cut. "finish the report. For Sarah. Before Friday." → "finish the report for Sarah
 * before Friday".
 */
export function asOneThought(part: string): string {
  let current = '';
  for (const sentence of sentencesOf(part).filter((one) => !isEmpty(one))) {
    if (current === '') {
      current = sentence;
      continue;
    }
    const how = meeting(current, sentence);
    if (how !== 'cut') {
      current = joined(current, sentence, how);
      continue;
    }
    // Where the rules would have cut, the model heard one task: the two read on after a comma,
    // a word that starts a task in lower case ("…quý ba ấy, phải nộp cho chị Hương").
    const rules = hasMarks(sentence.toLowerCase()) ? marked : unmarked;
    const first = sentence.match(/^[\p{L}']+/u)?.[0] ?? '';
    const lower =
      first !== 'I' && startsTask(withoutHesitation(sentence), rules)
        ? sentence.charAt(0).toLocaleLowerCase() + sentence.slice(1)
        : sentence;
    current = `${current.replace(trailingStop, '')}, ${lower}`;
  }
  return current === '' ? part : current;
}

/** A part tidied into a task: hesitations, openers, leads and closers off, the first letter raised. */
export function cleanTask(part: string): string {
  const rules = hasMarks(part.toLowerCase()) ? marked : unmarked;
  let text = withoutHesitation(tidy(part)).replace(/^[\s,.;:!?"'-]+|[\s,.;:!?"'-]+$/g, '');
  for (let pass = 0; pass < 4; pass += 1) {
    const before = text;
    text = text.replace(rules.openers, '').replace(rules.leads, '').replace(rules.closers, '');
    text = withoutHesitation(text).replace(/^[\s,.;:!?"'-]+|[\s,.;:!?"'-]+$/g, '');
    if (text === before) break;
  }
  if (text === '') return '';
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

function isFeeling(part: string, rules: Rules): boolean {
  const front = withoutHesitation(part).replace(rules.openers, '');
  return rules.feeling.test(front) && !startsTask(front.replace(rules.feeling, ''), rules);
}

export type SplitRamble = {
  /** Each part as the user said it, in order. */
  readonly parts: readonly string[];
  /**
   * `split`: cut where new tasks start, with filler and feelings left out.
   * `sentences`: nothing looked like a task, so what was said is kept as said (filler aside).
   */
  readonly how: 'split' | 'sentences';
};

/**
 * One utterance (a hold to talk, or what was typed) cut into the parts that are tasks. It is cut
 * only where the person clearly said separate things: a new line, a joining word or a new task's
 * own start, or a list of short things. A long task said with fillers and pauses stays one task.
 * Nothing is ever lost: when no part looks like a task, what was said comes back as said (brief
 * 9). The same part said twice is kept once.
 */
export function splitRamble(text: string): SplitRamble {
  const parts: string[] = [];
  const kept: string[] = [];
  let anyTask = false;
  for (const block of text.split(/\n+/)) {
    for (const thought of thoughtsOf(block)) {
      const rules = hasMarks(thought.toLowerCase()) ? marked : unmarked;
      kept.push(thought);
      for (const part of clausesOf(thought, rules)) {
        if (isEmpty(part)) continue;
        if (isFeeling(part, rules)) continue;
        if (startsTask(withoutHesitation(part), rules)) anyTask = true;
        parts.push(part);
      }
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
  return { parts: unique(kept), how: 'sentences' };
}
