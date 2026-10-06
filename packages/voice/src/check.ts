import type { Attitude, Language } from '@scootch/domain';
import { contextWordReasons } from './context-words';
import { treatPlaceholder } from '@scootch/domain';

import { monsterFirstName, untrueControls, voiceGuides } from './guide';
import { offLimitsTopics, type OffLimitsTopic } from './guide/types';
import { normalise, vietnameseShare, wordListPattern, wordsOf } from './text';

/** Every kind of line or name a generation can return. */
export const lineKinds = [
  'hatch',
  'start',
  'working',
  'pickedUp',
  'checkIn',
  'tinyNextStep',
  'tinierNextStep',
  'tiniestNextStep',
  'twoMinutesLeft',
  'timeUp',
  'caught',
  'notFinished',
  'treatHandOver',
  'parkedThoughts',
  'releasedEarly',
  'notification',
  'deadline',
  'flavourText',
  'monsterName',
  'monsterTitle',
  'plainStep',
] as const;
export type LineKind = (typeof lineKinds)[number];

const sessionLine = { words: 20, characters: 160 } as const;

/**
 * The longest each kind may be, in words (a Vietnamese word is one syllable) and in characters.
 * The hatch line and the notification carry the voice guide's own limits.
 */
export const lineLimits: Readonly<Record<LineKind, { words: number; characters: number }>> = {
  hatch: sessionLine,
  start: sessionLine,
  working: sessionLine,
  pickedUp: sessionLine,
  checkIn: sessionLine,
  tinyNextStep: sessionLine,
  // Each smaller step is also a shorter instruction than the one before it.
  tinierNextStep: { words: 16, characters: 130 },
  tiniestNextStep: { words: 12, characters: 100 },
  twoMinutesLeft: sessionLine,
  timeUp: sessionLine,
  caught: sessionLine,
  notFinished: sessionLine,
  treatHandOver: sessionLine,
  parkedThoughts: sessionLine,
  releasedEarly: sessionLine,
  notification: { words: 14, characters: 110 },
  deadline: { words: 24, characters: 200 },
  flavourText: { words: 24, characters: 160 },
  monsterName: { words: 13, characters: 60 },
  monsterTitle: { words: 5, characters: 40 },
  plainStep: sessionLine,
};

/** Models overshoot a limit they are told, so the prompt asks for less than the check allows. */
export function promptWordLimit(kind: LineKind): number {
  return Math.floor(lineLimits[kind].words * 0.8);
}

export type CheckReason =
  | 'empty'
  | 'too_long'
  | 'banned_word'
  | 'user_worth'
  | 'missed_days'
  | `topic_${OffLimitsTopic}`
  | 'wrong_language'
  | 'wrong_pronoun'
  | 'name_shape'
  | 'copied_example'
  | 'session_length'
  | 'untrue_control'
  | 'treat_not_named';

export type LineToCheck = {
  readonly text: string;
  readonly kind: LineKind;
  readonly language: Language;
  readonly attitude: Attitude;
  /** The treat a `treatHandOver` line was filled with. Without it the line must hold the placeholder. */
  readonly treat?: string;
};

/** The reasons only, never the text, so a failure can be logged. */
export type LineCheck = { readonly ok: boolean; readonly reasons: readonly CheckReason[] };

/** A line said during a session must not name a session length: the user picks it afterwards. */
const sessionLength: Readonly<Record<Language, RegExp>> = {
  en: /\b(ten|10|twenty[- ]five|25|fifty|50)[- ]minutes?\b/,
  vi: /(?<![\p{L}\p{N}])(mười|10|hai mươi lăm|25|năm mươi|50) phút/u,
};

/** Counting days, weeks or months: "day 4", "three weeks", "ba tuần rồi". */
const dayCount: Readonly<Record<Language, RegExp>> = {
  en: /\bday (\d+|one|two|three|four|five|six|seven)\b|\b(\d+|two|three|four|five|six|seven|several|many) (days|weeks|months)\b/,
  vi: /ngày thứ \d+|(\d+|hai|ba|bốn|năm|sáu|bảy|mấy|nhiều) (ngày|tuần|tháng) (rồi|nay|liền|qua)/u,
};

const viDayWord = 'hai|ba|tư|năm|sáu|bảy';
/** "ngày thứ năm" is Thursday as often as it is day five. These say which it is. */
const viDayOrWeekday = new RegExp(`ngày thứ (?:${viDayWord})(?![\\p{L}])`, 'u');
const viWeekdayWritten = /ngày thứ (?:Hai|Ba|Tư|Năm|Sáu|Bảy)(?![\p{L}])/u;
const viDayCounted = new RegExp(
  `ngày thứ (?:${viDayWord})(?:[.,!:]| rồi| liền| liên tiếp)? (?:mà |rồi )?(?:không|chưa|vẫn|chẳng|chả|của|kể từ|bỏ|im)(?![\\p{L}])`,
  'u',
);
const viWeekdayAround = new RegExp(
  `(?:vào|đến|tới|hôm|sáng|trưa|chiều|tối|trước|sau|hẹn|từ|mỗi|về|cho|qua|là|đúng|nhằm)(?: cái)? ngày thứ (?:${viDayWord})(?![\\p{L}])|ngày thứ (?:${viDayWord}) (?:này|tới|sau|tuần|hàng tuần|mỗi tuần)(?![\\p{L}])`,
  'u',
);

/**
 * Whether a Vietnamese line counts days with "ngày thứ ...". Written as a weekday ("thứ Năm") or
 * used as one ("vào ngày thứ năm") it is a day of the week; followed by what did not happen, or
 * standing on its own, it is a count.
 */
function countsViDays(text: string, line: string): boolean {
  if (!viDayOrWeekday.test(line)) return false;
  if (viDayCounted.test(line)) return true;
  return !viWeekdayWritten.test(text.normalize('NFC')) && !viWeekdayAround.test(line);
}

const noSessionLength = new Set<LineKind>(['notification', 'deadline', 'flavourText']);
const namesAndTitles = new Set<LineKind>(['monsterName', 'monsterTitle']);

type Patterns = {
  readonly banned: RegExp;
  readonly userWorth: RegExp;
  readonly missedDays: RegExp;
  readonly topics: readonly (readonly [OffLimitsTopic, RegExp])[];
  readonly examples: ReadonlySet<string>;
  /** Example first names and the names a model defaults to, found anywhere in a name. */
  readonly takenNames: RegExp;
};

function patternsFor(language: Language): Patterns {
  const guide = voiceGuides[language];
  const examples = Object.values(guide.attitudes).flatMap((attitude) => attitude.examples);
  return {
    banned: wordListPattern(guide.bannedWords),
    userWorth: wordListPattern(guide.userWorth),
    missedDays: wordListPattern(guide.missedDays),
    topics: offLimitsTopics.map((topic) => [topic, wordListPattern(guide.offLimits[topic])]),
    examples: new Set(examples.map(normalise)),
    takenNames: wordListPattern([
      ...guide.monsterNames.map(monsterFirstName),
      ...voiceGuides.en.nameAttractors,
      ...guide.nameAttractors,
    ]),
  };
}

const patterns: Readonly<Record<Language, Patterns>> = {
  en: patternsFor('en'),
  vi: patternsFor('vi'),
};

/** "Name, Title of Something" with one comma, or a short name with none. */
function nameShapeIsRight(text: string): boolean {
  if (/[.!?:;"“”]/.test(text)) return false;
  const parts = text.split(',').map((part) => wordsOf(part).length);
  const [name = 0, title = 0] = parts;
  if (parts.length === 1) return name >= 1 && name <= 4;
  return parts.length === 2 && name >= 1 && name <= 4 && title >= 2 && title <= 9;
}

function languageIsWrong(text: string, language: Language): boolean {
  const count = wordsOf(text).length;
  const share = vietnameseShare(text);
  return language === 'vi' ? count >= 4 && share < 0.3 : count >= 3 && share > 0.3;
}

/**
 * Checks one generated line or name against the voice guide. It runs on every generation, not
 * only in evals. Pure: the same line always gets the same answer.
 */
export function checkLine({ text, kind, language, attitude, treat }: LineToCheck): LineCheck {
  const line = normalise(text);
  if (line === '') return { ok: false, reasons: ['empty'] };

  const reasons: CheckReason[] = [];
  const found = patterns[language];
  const limit = lineLimits[kind];
  // A plain step is an instruction for a heavy task: it may name what the task is about.
  const plain = kind === 'plainStep';

  if (wordsOf(line).length > limit.words || text.trim().length > limit.characters) {
    reasons.push('too_long');
  }
  if (found.banned.test(line)) reasons.push('banned_word');
  for (const reason of contextWordReasons(line, language)) {
    if (!reasons.includes(reason) && !(plain && reason.startsWith('topic_'))) reasons.push(reason);
  }
  if (found.userWorth.test(line) && !reasons.includes('user_worth')) reasons.push('user_worth');
  if (
    kind !== 'deadline' &&
    (found.missedDays.test(line) ||
      dayCount[language].test(line) ||
      (language === 'vi' && countsViDays(text, line)))
  ) {
    reasons.push('missed_days');
  }
  if (!plain) {
    for (const [topic, pattern] of found.topics) {
      if (pattern.test(line) && !reasons.includes(`topic_${topic}`)) reasons.push(`topic_${topic}`);
    }
  }
  if (languageIsWrong(line, language)) reasons.push('wrong_language');
  // Soft speaks as "mình" in Vietnamese; "tui" belongs to the two louder attitudes.
  if (language === 'vi' && attitude === 'soft' && /(?<![\p{L}])tui(?![\p{L}])/u.test(line)) {
    reasons.push('wrong_pronoun');
  }
  if (kind === 'monsterName') {
    if (!nameShapeIsRight(text)) reasons.push('name_shape');
    if (found.takenNames.test(line)) reasons.push('copied_example');
  } else if (found.examples.has(line)) {
    reasons.push('copied_example');
  }
  if (
    !noSessionLength.has(kind) &&
    !namesAndTitles.has(kind) &&
    sessionLength[language].test(line)
  ) {
    reasons.push('session_length');
  }
  if (!namesAndTitles.has(kind) && untrueControls[language].test(line)) {
    reasons.push('untrue_control');
  }
  if (kind === 'treatHandOver') {
    const named = treat === undefined ? treatPlaceholder : normalise(treat);
    if (!line.includes(named)) reasons.push('treat_not_named');
  }
  return { ok: reasons.length === 0, reasons };
}
