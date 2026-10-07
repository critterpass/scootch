import type { DrawerItemRow, Id, IsoDate, TaskRow, TaskScreen } from '../contracts';
import { addDays, daysBetween, isoFromInstant, type Instant } from '../day';

/** An undated item fades this many days after it was last mentioned. */
export const FADE_AFTER_DAYS = 14;
/** A date this close when it is heard comes back the day before; anything further out, a week before. */
export const NEAR_DEADLINE_DAYS = 7;
export const NEAR_LEAD_DAYS = 1;
export const FAR_LEAD_DAYS = 7;

/**
 * The morning a dated thing comes back as the one thing, fixed on the day the date was heard:
 * "due Friday, back on Thursday" and "expires 30 Oct, back on 23 Oct". Never earlier than `heardOn`.
 */
export function returnDateFor(dueDate: IsoDate, heardOn: IsoDate): IsoDate {
  const lead = daysBetween(heardOn, dueDate) > NEAR_DEADLINE_DAYS ? FAR_LEAD_DAYS : NEAR_LEAD_DAYS;
  const back = addDays(dueDate, -lead);
  return back < heardOn ? heardOn : back;
}

export function fadeDateFor(lastMentionedOn: IsoDate): IsoDate {
  return addDays(lastMentionedOn, FADE_AFTER_DAYS);
}

/** Two wordings are the same parked thing when they differ only in case and spacing. */
export function sameThing(a: string, b: string): boolean {
  const tidy = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');
  return tidy(a) === tidy(b);
}

/** Something to park: a thing the brain dump did not pick, a heard deadline, or a kept thought. */
export interface Parkable {
  readonly text: string;
  readonly dueDate?: IsoDate | null;
}

export interface ParkInput {
  readonly drawer: readonly DrawerItemRow[];
  readonly things: readonly Parkable[];
  /** The care flag of the text these came from; a kept thought is `unscreened`. */
  readonly screen: TaskScreen;
  readonly today: IsoDate;
  readonly now: Instant;
  /** Makes the id of each new row. */
  readonly nextId: () => Id;
}

/**
 * The drawer after parking. A thing already in the drawer is not parked twice: mentioning it again
 * moves its fade two weeks on, and a date heard for it now gives it a return morning.
 */
export function parkThings(input: ParkInput): DrawerItemRow[] {
  const drawer = [...input.drawer];
  for (const thing of input.things) {
    const dueDate = thing.dueDate ?? null;
    const at = drawer.findIndex((item) => sameThing(item.text, thing.text));
    const known = drawer[at];
    if (known) {
      drawer[at] = mentionAgain(known, input.today, dueDate);
      continue;
    }
    drawer.push({
      id: input.nextId(),
      text: thing.text,
      screen: input.screen,
      dueDate,
      firstMentionedOn: input.today,
      lastMentionedOn: input.today,
      returnOn: dueDate === null ? null : returnDateFor(dueDate, input.today),
      fadesOn: dueDate === null ? fadeDateFor(input.today) : null,
      createdAt: isoFromInstant(input.now),
    });
  }
  return drawer;
}

/** The item after the user mentioned it again, optionally with a date heard this time. */
export function mentionAgain(
  item: DrawerItemRow,
  today: IsoDate,
  heardDueDate: IsoDate | null = null,
): DrawerItemRow {
  const dueDate = heardDueDate ?? item.dueDate;
  const returnOn =
    heardDueDate !== null && heardDueDate !== item.dueDate
      ? returnDateFor(heardDueDate, today)
      : item.returnOn;
  return {
    ...item,
    dueDate,
    lastMentionedOn: today,
    returnOn: dueDate === null ? null : returnOn,
    fadesOn: dueDate === null ? fadeDateFor(today) : null,
  };
}

/** The longest a parked thing's words may be: a task's own limit. */
export const ITEM_TEXT_MAX = 280;

/**
 * The item with new words from the person. Rewording is mentioning it again. The words have not
 * been screened; an item that was serious stays serious until a screen says otherwise. Empty or
 * unchanged words give the same item back.
 */
export function editItem(item: DrawerItemRow, words: string, today: IsoDate): DrawerItemRow {
  const text = words.trim().replace(/\s+/g, ' ').slice(0, ITEM_TEXT_MAX);
  if (text === '' || text === item.text) return item;
  return {
    ...mentionAgain(item, today),
    text,
    screen: item.screen === 'serious' ? 'serious' : 'unscreened',
  };
}

/** Undated items whose two weeks are up are deleted; dated ones never fade. */
export function fadeDrawer(
  drawer: readonly DrawerItemRow[],
  today: IsoDate,
): { readonly kept: DrawerItemRow[]; readonly fadedIds: Id[] } {
  const kept: DrawerItemRow[] = [];
  const fadedIds: Id[] = [];
  for (const item of drawer) {
    if (item.fadesOn !== null && item.fadesOn <= today) fadedIds.push(item.id);
    else kept.push(item);
  }
  return { kept, fadedIds };
}

/**
 * The one dated item due back this morning, or `null`. When several are due, the nearest date
 * wins and the others wait for the next morning.
 */
export function returningItem(
  drawer: readonly DrawerItemRow[],
  today: IsoDate,
): DrawerItemRow | null {
  const due = drawer.filter((item) => item.returnOn !== null && item.returnOn <= today);
  due.sort(
    (a, b) =>
      (a.dueDate ?? '').localeCompare(b.dueDate ?? '') ||
      a.firstMentionedOn.localeCompare(b.firstMentionedOn) ||
      a.id.localeCompare(b.id),
  );
  return due[0] ?? null;
}

/** What the day needs to make a drawer item today's one thing. The task call then writes the rest. */
export interface SwappedInThing {
  readonly text: string;
  readonly source: 'drawer';
  readonly screen: TaskScreen;
  readonly localDate: IsoDate;
  readonly firstMentionedOn: IsoDate;
  readonly dueDate: IsoDate | null;
}

export interface SwapInput {
  readonly drawer: readonly DrawerItemRow[];
  readonly itemId: Id;
  /** Today's one thing, if one is set. */
  readonly current: TaskRow | null;
  readonly today: IsoDate;
  readonly now: Instant;
  readonly nextId: () => Id;
}

export type SwapResult =
  | {
      readonly ok: true;
      readonly drawer: DrawerItemRow[];
      readonly oneThing: SwappedInThing;
      /** The task row the caller removes, with its monster. */
      readonly replacedTaskId: Id | null;
    }
  | { readonly ok: false; readonly reason: 'not_in_drawer' | 'already_started' };

/**
 * Swaps a drawer item in for today's one thing. The thing it replaces goes into the drawer in its
 * place, keeping the day it was first mentioned. A thing already started cannot be swapped out.
 */
export function swapIn(input: SwapInput): SwapResult {
  const item = input.drawer.find((one) => one.id === input.itemId);
  if (!item) return { ok: false, reason: 'not_in_drawer' };
  if (input.current && input.current.status !== 'set')
    return { ok: false, reason: 'already_started' };

  let drawer = input.drawer.filter((one) => one.id !== item.id);
  if (input.current) {
    const { current } = input;
    drawer = parkThings({
      drawer,
      things: [{ text: current.text, dueDate: current.dueDate }],
      screen: current.screen,
      today: input.today,
      now: input.now,
      nextId: input.nextId,
    }).map((one) =>
      sameThing(one.text, current.text)
        ? { ...one, firstMentionedOn: current.firstMentionedOn }
        : one,
    );
  }
  return {
    ok: true,
    drawer,
    oneThing: {
      text: item.text,
      source: 'drawer',
      screen: item.screen,
      localDate: input.today,
      firstMentionedOn: item.firstMentionedOn,
      dueDate: item.dueDate,
    },
    replacedTaskId: input.current?.id ?? null,
  };
}
