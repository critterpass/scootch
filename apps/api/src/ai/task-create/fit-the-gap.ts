import {
  DEFAULT_GET_READY_LEAD_MINUTES,
  type HeardTime,
  type Language,
  type TaskCreateRequest,
  type TaskLabels,
} from '@scootch/domain';
import { groundedShare } from '@scootch/voice';

import { decideContext, type TaskCreateContext } from './context';
import { wallClockMinutes } from './heard-times';
import { labelsFor } from './labels';
import { pickToFit } from './pick';
import { type SortedThings } from './things';

/** Under this many minutes before getting ready, the one thing should be one that fits. */
export const shortGapUnder = 60;
/** What "fits" means: a thing done in about ten minutes. A gap shorter than this fits nothing. */
export const fitsMinutes = 10;

type Clock = Pick<TaskCreateRequest, 'localTime' | 'timeZone' | 'getReadyLeadMinutes'>;

/**
 * Whole minutes from the phone's clock until getting ready starts for a time heard today: the
 * heard time less the lead from the user's settings. `null` when there is no clock to read.
 */
export function minutesBeforeGetReady(heardTime: HeardTime, request: Clock): number | null {
  const now = wallClockMinutes(request.localTime, request.timeZone);
  const [hour = NaN, minute = NaN] = heardTime.at.split(':').map(Number);
  if (now === null || !Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  const lead = request.getReadyLeadMinutes ?? DEFAULT_GET_READY_LEAD_MINUTES;
  return hour * 60 + minute - lead - now;
}

/** Whether the gap is short enough to steer the pick, and long enough for a thing that fits. */
export function asksForAFit(gapMinutes: number | null): gapMinutes is number {
  return gapMinutes !== null && gapMinutes >= fitsMinutes && gapMinutes < shortGapUnder;
}

/** One wording holds nearly all of the other's words: "Write the essay" and "Write the whole essay". */
function sameThing(a: string, b: string, language: Language): boolean {
  return groundedShare(a, b, language) >= 0.8 || groundedShare(b, a, language) >= 0.8;
}

export type Picked = { readonly sorted: SortedThings; readonly labels: TaskLabels };

/**
 * With a time heard today and under an hour before getting ready, the one thing is one that fits
 * ten minutes, as energy steers the pick. A first pick that does not fit is asked for once more
 * among the other things the note names, and the new one is used only when it fits; otherwise the
 * first stands and the phone keeps plain company. A thing due soon is kept, as the pick keeps it.
 * The first one thing is never lost: it goes to the drawer with the rest.
 */
export async function fitTheGap(
  context: TaskCreateContext,
  request: TaskCreateRequest,
  first: Picked,
): Promise<Picked> {
  const { sorted, labels } = first;
  const heard = sorted.heardTime;
  if (heard === null || labels.fitsTenMinutes) return first;
  if (sorted.oneThing.dueDate !== null || sorted.parked.length === 0) return first;
  const gap = minutesBeforeGetReady(heard, request);
  if (!asksForAFit(gap)) return first;

  const tooLong = sorted.oneThing.text;
  const again = await pickToFit(context, request, gap, tooLong);
  if (again === null || again.oneThing.dueDate !== null) return first;
  const fitted = await labelsFor(decideContext(context), again.oneThing.text);
  if (!fitted.fitsTenMinutes) return first;

  const { language } = request;
  // The first one thing, however the second pick worded it, is in the drawer once.
  const others = again.parked.filter((one) => !sameThing(one.text, tooLong, language));
  const dated = again.dated.some((one) => sameThing(one.text, tooLong, language));
  return {
    sorted: {
      ...again,
      parked: dated ? others : [{ text: tooLong }, ...others].slice(0, 30),
      heardTime: heard,
    },
    labels: fitted,
  };
}
