import type {
  HeardDeadline,
  HeardTime,
  Language,
  OneThing,
  ParkedItem,
  TaskCreateRequest,
} from '@scootch/domain';
import { groundedShare, isGroundedIn, normalise, wordsOf } from '@scootch/voice';

import { resolveHeardDate } from './deadlines';
import { namesAnotherDay, resolveHeardTime, wallClockMinutes } from './heard-times';
import type { PlainOutput } from './schema';

const longestTask = 280;
const longestHeardAs = 80;
/** A thing said with a time is named in a few words; anything longer is a sentence, not a name. */
const mostThingWords = 5;

/** Why the one thing a generation chose cannot be used. */
export type OneThingProblem = 'empty' | 'too_long' | 'not_in_text' | 'declined';

/** Two wordings of the same task: each one's words are nearly all in the other. */
function sameTask(a: string, b: string, language: Language): boolean {
  return groundedShare(a, b, language) >= 0.8 && groundedShare(b, a, language) >= 0.8;
}

/** The one thing must come from the text and must not be one the user already turned down. */
export function oneThingProblem(
  oneThing: string,
  { text, language, declined = [] }: Pick<TaskCreateRequest, 'text' | 'language' | 'declined'>,
): OneThingProblem | null {
  const thing = oneThing.trim();
  if (thing === '') return 'empty';
  if (thing.length > longestTask) return 'too_long';
  if (!isGroundedIn(thing, text, language)) return 'not_in_text';
  if (declined.some((item) => sameTask(thing, item, language))) return 'declined';
  return null;
}

export type SortedThings = {
  readonly oneThing: OneThing;
  readonly parked: ParkedItem[];
  /** Dated things, with the line still to be written by the caller. */
  readonly dated: Omit<HeardDeadline, 'line'>[];
  /** A clock time said for today, or `null`. */
  readonly heardTime: HeardTime | null;
};

type TextAndClock = Pick<
  TaskCreateRequest,
  'text' | 'language' | 'localDate' | 'timeZone' | 'localTime'
>;

/**
 * The clock time a generation heard for today, worked out in code from the user's own words and
 * their clock. `null` unless the phrase is in the text, reads as a time still ahead today, and
 * sits with no other day: said with one, the thing is a deadline and the time is not kept.
 */
function heardTimeOf(
  heard: PlainOutput['timeToday'],
  dated: readonly Omit<HeardDeadline, 'line'>[],
  oneThing: OneThing,
  { text, language, localDate, timeZone, localTime }: TextAndClock,
): HeardTime | null {
  const words = heard?.heardAs.trim() ?? '';
  if (heard == null || words === '' || words.length > longestHeardAs) return null;
  const nowMinutes = wallClockMinutes(localTime, timeZone);
  if (nowMinutes === null || namesAnotherDay(words, text, localDate)) return null;
  const at = resolveHeardTime({ heardAs: words, text, nowMinutes });
  if (at === null) return null;

  const named = heard.thing?.trim() ?? '';
  const thing =
    named !== '' &&
    wordsOf(named).length <= mostThingWords &&
    isGroundedIn(named, text, language) &&
    !normalise(words).includes(normalise(named))
      ? named
      : null;
  // The same thing heard with another day is that day's deadline, whatever time came with it.
  const elsewhere = [...dated, ...(oneThing.dueDate === null ? [] : [oneThing])];
  if (
    thing !== null &&
    elsewhere.some((one) => one.dueDate !== localDate && isGroundedIn(thing, one.text, language))
  ) {
    return null;
  }
  const whole = thing === null ? words : `${thing} ${words}`;
  return { at, heardAs: whole.length > longestHeardAs ? words : whole };
}

/**
 * Sorts what a generation heard into the one thing, the parked rest and the dated rest. Anything
 * the text does not name is dropped. A date is kept only when code can work it out from the
 * user's own phrase; a thing whose date fails that is parked without one. A clock time for today
 * is kept the same way: only when code can read it from the user's own words.
 */
export function sortThings(
  output: Pick<PlainOutput, 'oneThing' | 'oneThingDue' | 'parked' | 'dated' | 'timeToday'>,
  request: TextAndClock,
): SortedThings {
  const { text, language, localDate } = request;
  const oneThing = output.oneThing.trim();
  const seen = [oneThing];
  const isNew = (thing: string) => {
    if (thing === '' || thing.length > longestTask || !isGroundedIn(thing, text, language)) {
      return false;
    }
    if (seen.some((other) => sameTask(other, thing, language))) return false;
    seen.push(thing);
    return true;
  };
  const dateOf = (heard: { heardAs: string; date: string }) =>
    heard.heardAs.trim().length > longestHeardAs
      ? null
      : resolveHeardDate({ heardAs: heard.heardAs, candidate: heard.date, text, localDate });

  const parked: ParkedItem[] = [];
  const dated: Omit<HeardDeadline, 'line'>[] = [];
  // The writer sometimes lists the one thing among the dated things: its date belongs to it.
  let oneThingDue = output.oneThingDue == null ? null : dateOf(output.oneThingDue);
  for (const item of output.dated) {
    const thing = item.text.trim();
    const dueDate = dateOf(item);
    if (thing !== '' && sameTask(thing, oneThing, language)) oneThingDue ??= dueDate;
    if (!isNew(thing)) continue;
    if (dueDate === null) parked.push({ text: thing });
    else dated.push({ text: thing, dueDate, heardAs: item.heardAs.trim() });
  }
  for (const item of output.parked) {
    const thing = item.trim();
    if (isNew(thing)) parked.push({ text: thing });
  }
  const one = { text: oneThing, dueDate: oneThingDue };
  const heardTime = heardTimeOf(output.timeToday, dated, one, request);
  // Somewhere to be at a time is not a thing to do: said back as a time, it is not parked too.
  const heardThing = heardTime === null ? '' : (output.timeToday?.thing?.trim() ?? '');
  return {
    oneThing: one,
    parked: parked
      .filter((item) => heardThing === '' || !sameTask(item.text, heardThing, language))
      .slice(0, 30),
    dated: dated.slice(0, 10),
    heardTime,
  };
}
