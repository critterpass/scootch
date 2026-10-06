import type {
  HeardDeadline,
  Language,
  OneThing,
  ParkedItem,
  TaskCreateRequest,
} from '@scootch/domain';
import { groundedShare, isGroundedIn } from '@scootch/voice';

import { resolveHeardDate } from './deadlines';
import type { PlainOutput } from './schema';

const longestTask = 280;
const longestHeardAs = 80;

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
};

/**
 * Sorts what a generation heard into the one thing, the parked rest and the dated rest. Anything
 * the text does not name is dropped. A date is kept only when code can work it out from the
 * user's own phrase; a thing whose date fails that is parked without one.
 */
export function sortThings(
  output: Pick<PlainOutput, 'oneThing' | 'oneThingDue' | 'parked' | 'dated'>,
  { text, language, localDate }: Pick<TaskCreateRequest, 'text' | 'language' | 'localDate'>,
): SortedThings {
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
  return {
    oneThing: { text: oneThing, dueDate: oneThingDue },
    parked: parked.slice(0, 30),
    dated: dated.slice(0, 10),
  };
}
