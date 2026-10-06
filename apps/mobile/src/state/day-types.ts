import type {
  Ask,
  DrawerEvent,
  DrawerItemRow,
  Energy,
  HeardDeadline,
  Id,
  Instant,
  IsoDate,
  MonsterRow,
  MorningOffer,
  ParkedThought,
  SessionEvent,
  SessionLine,
  SessionState,
  SettingsRow,
  TodayState,
} from '@scootch/domain';

import type { TaskClient } from '../api/task-client';
import type { Repositories } from '../data/repositories';
import type { Clock } from '../effects/adapters';
import type { EffectsRunner } from '../effects/effects-runner';

/** Everything a screen can do to the day. The store adds the current time itself. */
export type DayEvent =
  | {
      readonly type: 'text_submitted';
      readonly text: string;
      readonly source: 'ramble' | 'typed';
      readonly energy: Energy | 'guess';
    }
  /** "Another": the offered one thing is turned down and a different one is asked for. */
  | { readonly type: 'another_asked' }
  /** "That's the one". The ramble's transcript goes unless the person keeps transcripts. */
  | { readonly type: 'one_thing_picked' }
  /** A heard date is answered: it stays parked for its day, or is swapped in for today. */
  | { readonly type: 'deadline_answered'; readonly text: string; readonly choice: 'park' | 'today' }
  /** "Swap in" on a drawer item, or "Fine, that one": it becomes today's one thing. */
  | { readonly type: 'drawer_item_swapped_in'; readonly itemId: Id }
  /** "Pick for me", and "Pick again": Scootch offers one thing from the drawer. */
  | { readonly type: 'pick_for_me' }
  /** "Not now", with the person's reason: Scootch counters with a smaller ask. */
  | { readonly type: 'excuse_given'; readonly text: string }
  /** "Smaller", on the counter-offer. */
  | { readonly type: 'smaller_asked' }
  /** "Deal": the session is set at the bargained length. Starting it is a session event. */
  | { readonly type: 'deal_struck'; readonly treat?: string | null }
  /** "Too big": the task and its monster both get smaller. */
  | { readonly type: 'too_big' }
  /** "Catch him": the hatch is over and the task is set. */
  | { readonly type: 'monster_met' }
  /** "Something else", on a morning with yesterday's task: it goes to the drawer. */
  | { readonly type: 'carried_task_set_aside' }
  | { readonly type: 'session_set'; readonly minutes: number; readonly treat?: string | null }
  | { readonly type: 'session'; readonly event: SessionEvent }
  | { readonly type: 'drawer'; readonly event: DrawerEvent }
  | {
      readonly type: 'thought_resolved';
      readonly thought: ParkedThought;
      readonly resolution: 'keep' | 'discard';
    }
  | { readonly type: 'done_for_today' }
  /** Scootch says the next of the task's working lines. */
  | { readonly type: 'working_line_turned' }
  /** The screens are through with an ended session: what was handed over for it is cleared. */
  | { readonly type: 'session_closed' }
  /** Developer tools only: the running session's timer comes due this many seconds from now. */
  | { readonly type: 'developer_session_ends_in'; readonly seconds: number }
  | { readonly type: 'settings_changed'; readonly changes: Partial<Omit<SettingsRow, 'id'>> }
  | { readonly type: 'connection_returned' }
  | { readonly type: 'app_foregrounded' }
  | { readonly type: 'app_backgrounded' };

/** What the brain dump puts on the screen before the one thing: the phrases, and which one it is. */
export interface Reveal {
  readonly phrases: readonly string[];
  readonly chosen: number;
}

/**
 * Where the person is between sending their words and a set task. It lives in memory only: after
 * a relaunch the task is simply set.
 */
export type PickStep =
  | { readonly kind: 'none' }
  /** "Today's one thing". `reveal` is `null` for a single typed task, which has nothing to fall away. */
  | { readonly kind: 'offered'; readonly reveal: Reveal | null; readonly another: boolean }
  | { readonly kind: 'picked_for_me'; readonly itemId: Id }
  | { readonly kind: 'hatching'; readonly shrunk: boolean }
  /** The counter-offer to an excuse. `ask` only ever gets smaller. */
  | { readonly kind: 'bargaining'; readonly excuse: string; readonly ask: Ask };

const PICK_EVENTS = [
  'one_thing_picked',
  'deadline_answered',
  'drawer_item_swapped_in',
  'pick_for_me',
  'excuse_given',
  'smaller_asked',
  'deal_struck',
  'too_big',
  'monster_met',
  'carried_task_set_aside',
] as const;
/** The events between a sent ramble and a set task. */
export type PickEvent = Extract<DayEvent, { readonly type: (typeof PICK_EVENTS)[number] }>;

export function isPickEvent(event: DayEvent): event is PickEvent {
  return (PICK_EVENTS as readonly string[]).includes(event.type);
}

export interface ShownLine {
  readonly slot: SessionLine | 'hatch' | 'working';
  readonly text: string;
}

/** What the screens read. Everything but the transient parts is rebuilt from storage. */
export interface DayState {
  /** False until the store has rebuilt today from storage. */
  readonly ready: boolean;
  readonly localDate: IsoDate;
  readonly today: TodayState;
  readonly morning: MorningOffer;
  readonly pick: PickStep;
  /** The battery has not been asked about today: it is asked before the first pick. */
  readonly energyNeeded: boolean;
  readonly session: SessionState | null;
  readonly monster: MonsterRow | null;
  /** The task has no monster yet because the server has not answered for it. */
  readonly monsterPending: boolean;
  /** `held`: the phone's gate saw a dark or heavy word, so nothing funny shows while waiting. */
  readonly taskCall: 'idle' | 'waiting' | 'held';
  /** The server would not take the text: the person is asked to say it another way. */
  readonly notice: 'say_it_another_way' | null;
  /** Dates heard in the last ramble, each with the line that says it out loud. */
  readonly heardDeadlines: readonly HeardDeadline[];
  readonly line: ShownLine | null;
  readonly burst: 'start' | 'confetti' | null;
  readonly treat: string | null;
  /** Thoughts handed over at the end of a session, waiting for keep or discard. */
  readonly parkedThoughts: readonly ParkedThought[];
  readonly drawer: { readonly open: boolean; readonly items: readonly DrawerItemRow[] };
  readonly settings: SettingsRow;
}

export interface DayStoreDeps {
  readonly repositories: Repositories;
  readonly clock: Clock;
  readonly timeZone: () => string;
  readonly nextId: () => Id;
  readonly tasks: TaskClient;
  readonly online: () => Promise<boolean>;
  readonly runner: EffectsRunner;
  /** The language of the phone, used until the person picks one. */
  readonly phoneLanguage: () => SettingsRow['language'];
  /** Whether Plus is active. */
  readonly plus: () => boolean;
}

/** The text a task call is being made for, kept in memory only until its one thing is picked. */
export interface Offer {
  readonly text: string;
  readonly source: 'ramble' | 'typed';
  readonly energy: Energy | 'guess';
  readonly declined: readonly string[];
  readonly transcriptId: Id | null;
  /** Drawer items parked from this text and not yet offered: "Another" takes the next of them. */
  readonly candidates: readonly Id[];
}

/** The store's working memory between events. */
export interface DayMemory {
  state: DayState;
  offer: Offer | null;
  sessionRowId: Id | null;
  lastOpenedDay: IsoDate | null;
  workingTurn: number;
  /** The second stage of a task call is on its way, so the task is not asked for again. */
  restPending: boolean;
  /** Drawer items "Pick again" has turned down since the last pick was taken. */
  turnedDown: Id[];
}

export interface DayContext {
  readonly deps: DayStoreDeps;
  readonly memory: DayMemory;
  /** Replaces part of the state and tells the subscribers. */
  set(changes: Partial<DayState>): void;
  /** Reads today back from storage, publishes it and brings the notifications in line. */
  refresh(): Promise<void>;
  now(): Instant;
  /**
   * Runs `work` as its own step once `arrives` has settled, without holding up the events sent in
   * the meantime. `arrives` must not reject.
   */
  later<T>(arrives: Promise<T>, work: (value: T) => Promise<void>): void;
}
