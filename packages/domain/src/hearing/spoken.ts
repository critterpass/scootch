import { foldMarks, hasMarks } from './text';

/**
 * How people talk while they think, in English and Vietnamese: the sounds made between words,
 * words said twice, a thought that cannot end where it paused, and the words that carry one on
 * or start the next. Splitting reads these so that a pause is never mistaken for a new task.
 */

/** A part that points back at the one before it: "it's due Friday" belongs to its task. */
export const refersBack =
  /^(?:it|it's|its|that|that's|which|this|they're|they are|due|nó|cái này|cái đó|hạn|hạn là|no|cai nay|cai do|han)(?![\p{L}\p{N}])/iu;

/**
 * Sounds made while thinking, dropped wherever they stand alone: "uhm", "er", "hmm", "ờ", "ừm".
 * "à" is left alone: in the middle of a sentence it is a word.
 */
const hesitation =
  /(?:^|[\s,;:]+)(?:u+h+m*|u+m+|e+r+m*|h+m+|m{3,}|a+h+|ờ+m*|ừ+m*|ơ+)(?=$|[\s,.;:!?…])[,.;:!?…]*/giu;

/** Words said between two commas while finding the next one: ", like,", ", kiểu,". */
const asides = /,\s*(?:like|you know|i mean|kiểu như|kiểu là|kiểu|thì là)\s*,/giu;

/**
 * The same words said twice across a pause or a comma: "the, the", "mình phải, mình phải". One
 * word said twice is a stutter only when it is a small word: "sữa, sữa chua" is milk and yoghurt.
 */
const stutter =
  /(?<![\p{L}\p{N}'])((?:[\p{L}\p{N}']+\s+){0,2}[\p{L}\p{N}']+)\s*(?:,|…|\.{2,})\s*\1(?![\p{L}\p{N}'])/giu;
const smallWords = new Set(
  "the a an to i i'm we we're you it and for of my our in on at so is need have mình tôi em anh chị tớ cần phải là thì cái cho để và với của".split(
    ' ',
  ),
);
const unstuttered = (said: string, words: string) =>
  words.includes(' ') || smallWords.has(words.toLowerCase()) ? words : said;
/** English small words said twice with no pause: "the the report". */
const doubled = /(?<![\p{L}])(the|a|an|to|i|we|and|for|of|my|our)\s+\1(?![\p{L}])/giu;

/** A thought taken back to the words in it: no hesitations, stutters or trailing dots. */
export function withoutHesitation(text: string): string {
  return text
    .replace(hesitation, ' ')
    .replace(stutter, unstuttered)
    .replace(doubled, '$1')
    .replace(asides, ' ')
    .replace(/\s*(?:…|\.{2,})\s*/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,(?:\s*,)+/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Words a thought cannot end on: it carries on after the pause. "We need…" "the evaluation";
 * "mình cần…" "làm cái đánh giá".
 */
const danglingEnglish = new Set(
  'to for of about with by from into the a an my your our their its and or but so is are was were be need needs want wants gotta gonna should must will would can could might i we like some any'.split(
    ' ',
  ),
);
/** Only read with marks: bare, "cho" is as much "chợ" as it is "for". */
const danglingVietnamese = new Set(
  'cần phải muốn nên sẽ định nhớ cho của về để với và là thì mà cái các những một làm bị được'.split(
    ' ',
  ),
);

/** Words that carry a thought on from the sentence before: "…the report." "For Sarah." */
const continuing =
  /^(?:for|to|about|with|by|before|after|until|till|at|on|in|from|of|because|since|which|who|where|when|while|regarding|re|including|cho|về|để|của|với(?!\s+(?:lại|cả))|trước(?!\s+(?:tiên|hết))|lúc|vào|mà|là|vì|tại|ở|đến|tới|hoặc|hay là)(?![\p{L}\p{N}])/iu;
/** The same, for Vietnamese typed without marks: only the words that are not English too. */
const continuingFolded = /^(?:cho|cua|truoc(?!\s+(?:tien|het))|luc)(?![\p{L}\p{N}])/iu;

/** Words that say a separate thing is coming: "Also…", "And then…", "Với lại…", "Rồi…". */
const joinerSource =
  'and also|and then|oh and also|oh and|and|also|then|plus|after that|next|another thing|apart from that|besides that|second|secondly|third|thirdly|lastly|với lại|với cả|còn|rồi|sau đó|xong rồi|xong|thêm nữa|nữa là|tiếp theo|ngoài ra|và';
export const joinerStart = new RegExp(`^(?:${joinerSource})(?![\\p{L}\\p{N}])[\\s,]*`, 'iu');
export const joinerStartFolded = new RegExp(
  `^(?:${foldMarks(joinerSource.replace('|còn', ''))})(?![\\p{L}\\p{N}])[\\s,]*`,
  'iu',
);

function lastWord(text: string): string {
  const words = withoutHesitation(text)
    .toLowerCase()
    .match(/[\p{L}\p{N}']+/gu);
  return words?.[words.length - 1] ?? '';
}

/** Whether a part ends where it cannot: on a want, a link or an article. */
export function endsDangling(text: string): boolean {
  const last = lastWord(text);
  return (
    danglingEnglish.has(last) || (hasMarks(text.toLowerCase()) && danglingVietnamese.has(last))
  );
}

/** "Cho mèo ăn" is feeding the cat, a task of its own, not "for the cat". */
const feeding =
  /^cho\s+(?:[\p{L}]+\s+){0,2}?(?:ăn|uống|bú|ngủ|chơi|tắm|an|uong|bu|ngu|choi|tam)(?![\p{L}\p{N}])/iu;

export function startsContinuing(text: string): boolean {
  const front = withoutHesitation(text);
  if (feeding.test(front)) return false;
  return continuing.test(front) || (!hasMarks(front.toLowerCase()) && continuingFolded.test(front));
}
