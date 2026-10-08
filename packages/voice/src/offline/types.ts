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
  /** Plus has just been bought, on any plan: said once, under the card that arrives. */
  'plusWelcome',
  'trialEndsTomorrow',
  'trialLastDay',
  'renewalOff',
  'plusCancelled',
  'lifetime',
  /** The task was too big, so its monster was made smaller: said under the smaller task. */
  'shrunk',
  /** No connection: said on the one screen in place of the usual ask. */
  'offline',
  /** The model is down or slow: Scootch admits it, and the pick is the person's. */
  'modelDown',
  'modelDownMore',
  /** Under the one thing: the single other thing heard, parked out of sight. */
  'oneInDrawer',
  /** Under the one thing: how many other things were parked. `{count}` is the number. */
  'restInDrawer',
  /** Under the timer of a session whose task has not been screened yet. */
  'hatchesWhenBack',
  /** Neither iCloud Keychain nor iCloud storage answers, so there is no spare copy. */
  'backupOff',
  /** A new phone that already holds the backup token: the one line offering the world back. */
  'restoreOffer',
  /** Beside the camera button on the one screen: when words will not come, a photo will do. */
  'cameraOpen',
  /** Under a desk photo with one thing ringed, when no line could be written about it. */
  'cameraDesk',
  /** Under a room photo with one corner lit, when no line could be written about it. */
  'cameraRoom',
  /** After a session that began with a photo: asks for one more of the same spot. */
  'cameraAfterAsk',
  /** Under the two photos, side by side. */
  'cameraAfter',
  /** On the nightstand, under tomorrow's one thing. `{name}` is its monster's name. */
  'asleepTillTomorrow',
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
