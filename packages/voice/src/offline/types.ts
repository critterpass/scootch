import type { Attitude } from '@scootch/domain';

/** The slots an offline line can fill. `working` and `notification` hold several to rotate. */
export const offlineSlots = [
  'hatch',
  'start',
  'working',
  'pickedUp',
  'checkIn',
  'tinyNextStep',
  'twoMinutesLeft',
  'timeUp',
  'caught',
  'notFinished',
  'notification',
  'flavourText',
] as const;
export type OfflineSlot = (typeof offlineSlots)[number];

export type OfflineLines = Readonly<Record<OfflineSlot, readonly [string, ...string[]]>>;

/**
 * What Scootch says while there is no task to talk about: the first launch, the waiting screen,
 * the quiet end of the day, and the moments around Plus. One fixed line per slot.
 */
export const noTaskSlots = [
  'hello',
  'about',
  'attitudeAsk',
  'favours',
  'notificationsWhy',
  'microphoneWhy',
  'firstOneThing',
  'waiting',
  'typing',
  'doneForToday',
  'plusSheet',
  'plusOneMore',
  'plusOffer',
  'trialStarted',
  'trialEndsTomorrow',
  'trialLastDay',
  'renewalOff',
  'plusCancelled',
  'lifetime',
] as const;
export type NoTaskSlot = (typeof noTaskSlots)[number];

export type NoTaskLines = Readonly<Record<NoTaskSlot, string>>;

/** The plain-words lines for a heavy task: company, no comedy. */
export type PlainLines = {
  readonly acknowledge: string;
  readonly working: readonly [string, ...string[]];
  readonly tinyNextStep: string;
  readonly done: string;
  readonly notFinished: string;
};

/**
 * One language's offline pack. No line is about a specific task, so any of them can stand in for
 * a line that failed the voice check, and the phone can say them with no connection.
 */
export type OfflinePack = {
  readonly lines: Readonly<Record<Attitude, OfflineLines>>;
  readonly plain: PlainLines;
  readonly noTask: Readonly<Record<Attitude, NoTaskLines>>;
  /** "Name, Title" names for a monster whose own name failed the check. */
  readonly monsterNames: readonly [string, ...string[]];
  readonly monsterTitles: readonly [string, ...string[]];
  /** Says a heard date out loud, in the user's own words for the thing and the day. */
  readonly deadline: (attitude: Attitude | 'plain', thing: string, heardAs: string) => string;
  /**
   * Announces the next renewal of Plus before it is charged. `day` is the store's renewal day in
   * the user's words and `price` the store's own price text, or `null` when it is not known.
   */
  readonly renewal: (
    attitude: Attitude,
    plan: 'monthly' | 'yearly',
    day: string,
    price: string | null,
  ) => string;
};
