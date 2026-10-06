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
  /** "Name, Title" names for a monster whose own name failed the check. */
  readonly monsterNames: readonly [string, ...string[]];
  readonly monsterTitles: readonly [string, ...string[]];
  /** Says a heard date out loud, in the user's own words for the thing and the day. */
  readonly deadline: (attitude: Attitude | 'plain', thing: string, heardAs: string) => string;
};
