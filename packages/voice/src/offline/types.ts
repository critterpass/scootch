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
  'tinierNextStep',
  'tiniestNextStep',
  'treatHandOver',
  'parkedThoughts',
  'releasedEarly',
  'notification',
  'flavourText',
] as const;
export type OfflineSlot = (typeof offlineSlots)[number];

export type OfflineLines = Readonly<Record<OfflineSlot, readonly [string, ...string[]]>>;

/**
 * What Scootch says while there is no task to talk about: the first launch, the waiting screen
 * and the quiet end of the day. One fixed line per slot.
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
  /** No connection: said on the one screen in place of the usual ask. */
  'offline',
  /** The model is down or slow: Scootch admits it, and the pick is the person's. */
  'modelDown',
  'modelDownMore',
  /** Under the timer of a session whose task has not been screened yet. */
  'hatchesWhenBack',
  /** Neither iCloud Keychain nor iCloud storage answers, so there is no spare copy. */
  'backupOff',
  /** A new phone that already holds the backup token: the one line offering the world back. */
  'restoreOffer',
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
  /** The gentle reminder a person asked for. It never names the task. */
  readonly reminder: string;
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
};
