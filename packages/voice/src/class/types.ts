/**
 * The moments Thầy Phú speaks in, offline. Each language pack holds the same moments with the
 * same placeholders, written fresh in that language. The guide for how he speaks is in
 * `guide.en.md` and `guide.vi.md`.
 */

export type ClassLanguage = 'en' | 'vi';

export const moments = [
  // The desk, by pressure. Starting resets it to 0.
  'pressure0',
  'pressure1',
  'pressure2',
  'pressure3',
  'pressure4',
  'pressure5',
  // Why this task is on the desk.
  'pickDueToday',
  'pickWaitedLongest',
  'pickSlippedMost',
  'pickFitsTime',
  'swapAllowed',
  'firstThingToDesk',
  // Hearing a task.
  'deadlineHeard',
  'timeHeard',
  'writtenDown',
  'shortTap',
  // A period.
  'drumStart',
  'start',
  'looksUp',
  'raiseHand',
  'strayThought',
  'timeUp',
  // The finish.
  'commentFine',
  'commentGood',
  'commentGoodWork',
  'commentTen',
  'next',
  'recessOffered',
  'recessOver',
  // Not yet.
  'partialCredit',
  'partialAnotherPeriod',
  'partialBackOnBoard',
  'partialErase',
  'partialNotePrompt',
  'partialNoteReturns',
  // The late slip.
  'slipAsk',
  'slipTooTired',
  'slipAfterLunch',
  'slipNeedSomethingFirst',
  'gradeWeak',
  'gradeSeenIt',
  'gradeCreative',
  'slipAccepted',
  'frontRow',
  // The board.
  'boardLong',
  'boardStillYours',
  'boardErase',
  'emptyDesk',
  // First day.
  'firstDayClass',
  'firstDaySit',
  'rollCallAsk',
  'rollCallRepeat',
  'notesHomeAsk',
  'notesHomeExample',
  'notesHomeNotNow',
  'firstDayEmptyDesk',
  'comingBack',
  // Notes home, and tuition.
  'noteHome1',
  'noteHome2',
  'noteHome3',
  'tuitionChargeReminder',
  'tuitionFirstNotice',
  'scholarshipGranted',
  'winBack',
  // The timetable and the report card.
  'timetableAsk',
  'timetableWeekend',
  'reportCardComment',
  // Happenings.
  'happeningCat',
  'happeningPaperPlane',
  'happeningPowerCut',
  'happeningSaoDo',
  'happeningPrincipal',
  'happeningIceCream',
  'happeningPopQuiz',
  // Special days and his day.
  'teachersDay',
  'khaiGiang',
  'tet',
  'trungThu',
  'birthday',
  'examSeason',
  'monsoonLeak',
  'hotDay',
  'coldDay',
  'tapedGlasses',
  'newHaircut',
  // The note home a finish can be shared as (sổ liên lạc): who did it, then how long it waited.
  'shareNoteDone',
  'shareNoteWaited',
  'shareNoteSameDay',
  // Care.
  'seriousCompany',
  'seriousBeFunny',
  'crisis',
  'crisisCompany',
  // At night.
  'standBy',
] as const;
export type Moment = (typeof moments)[number];

/**
 * Moments that are one written line, the same every time. The brief or the design fixes the
 * words; a variant would weaken the joke or the rule.
 */
export const fixedMoments = {
  pressure5: 'Silence. His glasses glare; the line is only "...".',
  shortTap: 'One plain line for a tap too short to be speech, and nothing else.',
  drumStart: 'The school drum, identical in both languages.',
  timeUp: 'The drum again, then one question.',
  commentFine: 'A rung of the comment ladder: always the same word.',
  commentGood: 'A rung of the comment ladder: always the same word.',
  commentGoodWork: 'A rung of the comment ladder: always the same words.',
  next: 'One word after a finish.',
  partialAnotherPeriod: 'One of the three choices: a label that must read the same every time.',
  partialBackOnBoard: 'One of the three choices: a label that must read the same every time.',
  partialErase: 'One of the three choices: a label that must read the same every time.',
  slipAccepted: 'A genuine reason gets this word and nothing else.',
  frontRow: 'The fifth slip has one line.',
  firstDayClass: 'The opening of the first day: the class and its one student.',
  firstDaySit: 'His first word to a new student.',
  firstDayEmptyDesk: 'The last beat of the first day.',
  comingBack: 'Coming back after time away is never remarked on: the desk says only this.',
  standBy: 'At night he has gone home; the only line.',
} as const satisfies Partial<Record<Moment, string>>;
export type FixedMoment = keyof typeof fixedMoments;

/**
 * Moments where he says nothing, by rule. The set is empty in every language.
 */
export const silentMoments = {
  commentTen: 'The circled 10 has no words.',
  boardErase: 'Erasing is a decision to drop something. It gets no comment.',
  newHaircut: 'Nobody mentions it, him included.',
  crisis:
    'The crisis screen shows the localised helplines copy, never his voice. After it is closed he keeps plain company with `crisisCompany`.',
} as const satisfies Partial<Record<Moment, string>>;
export type SilentMoment = keyof typeof silentMoments;

/**
 * What a line may hold, filled on the phone.
 * - `{task}`: the task as the user said it.
 * - `{name}`: the given name from roll call.
 * - `{NAME}`: the full name, shouted: "TRẦN. MINH. ANH" (the line adds the last full stop).
 * - `{minutes}`: a number of minutes.
 * - `{date}` and `{time}`: a date or a time, already formatted for the language.
 * - `{price}`: a price, already formatted by the store.
 * - `{waited}`: how long a finished task had waited, written out for the language ("nine days").
 *   Only the shared note home holds it: the brief has him write the wait on a note the user
 *   chose to share, and nowhere else does he count it.
 */
export const placeholders = [
  'task',
  'name',
  'NAME',
  'minutes',
  'date',
  'time',
  'price',
  'waited',
] as const;
export type Placeholder = (typeof placeholders)[number];

type Variants<M extends Moment> = M extends SilentMoment
  ? readonly []
  : M extends FixedMoment
    ? readonly [string]
    : readonly [string, string, string, ...string[]];

/** One language's whole offline voice. */
export type LinePack = { readonly [M in Moment]: Variants<M> };
