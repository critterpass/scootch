import type {
  HuntRecord,
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
  TaskRow,
  TodayState,
} from '@scootch/domain';

import type { TaskClient } from '../api/task-client';
import type { Repositories } from '../data/repositories';
import type { Clock, Timers } from '../effects/adapters';
import type { EffectsRunner } from '../effects/effects-runner';

import type { ArrivedPages } from './arrived-pages';
import type { AfterLines } from './lines';

/** Everything a screen can do to the day. The store adds the current time itself. */
export type DayEvent =
  | {
      readonly type: 'text_submitted';
      readonly text: string;
      readonly source: 'ramble' | 'typed';
      readonly energy: Energy | 'guess';
    }
  /** "Cancel", while Scootch is thinking: the words go back to the composer and nothing is set. */
  | { readonly type: 'task_call_cancelled' }
  /** The composer has taken back the words a cancel returned. */
  | { readonly type: 'returned_text_taken' }
  /** "That's the one". The ramble's transcript goes unless the person keeps transcripts. */
  | { readonly type: 'one_thing_picked' }
  /** A heard date is answered: it stays parked for its day, or is swapped in for today. */
  | { readonly type: 'deadline_answered'; readonly text: string; readonly choice: 'park' | 'today' }
  /** "Swap in" on a drawer item, or "Fine, that one": it becomes today's one thing. */
  | { readonly type: 'drawer_item_swapped_in'; readonly itemId: Id }
  /** A parked thing swiped away or ticked off in the drawer: it leaves with no trace. */
  | { readonly type: 'drawer_item_removed'; readonly itemId: Id }
  /** The task waiting for tomorrow, swiped away in the drawer: it is let go with no trace. */
  | { readonly type: 'waiting_task_removed'; readonly taskId: Id }
  /** The task waiting for tomorrow, reworded in the drawer. */
  | { readonly type: 'waiting_task_edited'; readonly taskId: Id; readonly text: string }
  /** "Swap in" on the task waiting for tomorrow: it is today's one thing after all. */
  | { readonly type: 'waiting_task_swapped_in'; readonly taskId: Id }
  /** A parked thing reworded in the drawer. */
  | { readonly type: 'drawer_item_edited'; readonly itemId: Id; readonly text: string }
  /** "Pick for me", and "Pick again": Scootch offers one thing from the drawer. */
  | { readonly type: 'pick_for_me' }
  /** "Back", on Scootch's pick: it is dropped and nothing else changes. */
  | { readonly type: 'pick_dropped' }
  /** "Too big": the task and its monster both get smaller. */
  | { readonly type: 'too_big' }
  /** "Catch him": the hatch is over and the task is set. */
  | { readonly type: 'monster_met' }
  /** The discard button beside Start, on a task not yet started: its words go to the drawer. */
  | { readonly type: 'task_set_aside' }
  | { readonly type: 'session_set'; readonly minutes: number; readonly treat?: string | null }
  | { readonly type: 'session'; readonly event: SessionEvent }
  | { readonly type: 'drawer'; readonly event: DrawerEvent }
  | {
      readonly type: 'thought_resolved';
      readonly thought: ParkedThought;
      readonly resolution: 'keep' | 'discard';
    }
  /** A task that was started and left goes to the drawer whole; its start stays used. */
  | { readonly type: 'started_task_parked' }
  /** "Cancel" on the offered one thing: it is dropped, nothing is set, and home is back. */
  | { readonly type: 'one_thing_cancelled' }
  /** The store reported a change to Plus: today is worked out again. */
  | { readonly type: 'entitlement_changed' }
  /** The care screen was closed. The day's things are back, in plain company. */
  | { readonly type: 'care_closed' }
  /** "It's fine, be funny" on a serious task. It never does anything on a crisis day. */
  | { readonly type: 'be_funny_asked' }
  /** "Not today" on a serious task: it waits in the drawer and the day is quietly over. */
  | { readonly type: 'serious_set_aside' }
  /** "Remind me at …" on a serious task: one plain notification. */
  | { readonly type: 'reminder_asked' }
  /** Scootch says the next of the task's working lines. */
  | { readonly type: 'working_line_turned' }
  /** The screens are through with an ended session: what was handed over for it is cleared. */
  | { readonly type: 'session_closed' }
  /** At a table: the running session now ends when the table's clock does, on this phone's clock. */
  | { readonly type: 'table_clock'; readonly endsAt: number }
  /** Developer tools only: the running session's timer comes due this many seconds from now. */
  | { readonly type: 'developer_session_ends_in'; readonly seconds: number }
  | { readonly type: 'settings_changed'; readonly changes: Partial<Omit<SettingsRow, 'id'>> }
  /** Every local table was erased or replaced (delete everything, a restore): today is rebuilt. */
  | { readonly type: 'storage_replaced' }
  | { readonly type: 'connection_returned' }
  | { readonly type: 'app_foregrounded' }
  /** The clock passed the start of a new day with the app open. */
  | { readonly type: 'day_turned' }
  | { readonly type: 'app_backgrounded' }
  /** A control, the Action button or a Live Activity button asked for something. */
  | { readonly type: 'surface_action'; readonly action: SurfaceActionKind }
  /** The hunt record in the App Group, read as the app came to the front. */
  | { readonly type: 'hunt_adopted'; readonly hunt: HuntRecord }
  /**
   * A thing shared in from another app: its words, and whether it was for now or tomorrow. One
   * that arrives from a monster's page on the website names the page (the id in
   * `scootch.app/m/<id>`), so the monster it hatches is that one.
   */
  | {
      readonly type: 'thing_shared_in';
      readonly text: string;
      readonly when: 'now' | 'tomorrow';
      readonly monsterPage?: string;
    }
  /** A bite was ticked under a monster's notification; `place` is 0 to 2. */
  | { readonly type: 'bite_ticked'; readonly taskId: Id; readonly place: number }
  /** "Tomorrow at 9:00" under a notification: today's thing waits for tomorrow and today rests. */
  | { readonly type: 'hunt_tomorrow'; readonly taskId: Id }
  /** "Turn it down for a week": that thing's monster sends its messages at Soft for seven days. */
  | { readonly type: 'monster_turned_down'; readonly taskId: Id }
  /** A screen has acted on `surfaceRequest`, so it is cleared. */
  | { readonly type: 'surface_request_taken' }
  /** A step found by the camera: the composer sends its words as it sends typed ones. */
  | { readonly type: 'camera_step_chosen'; readonly text: string }
  /** Scootch was opened, or its Live Activity tapped, while a session was running. */
  | { readonly type: 'opened_mid_session' };

export type SurfaceActionKind = 'start_session' | 'brain_dump' | 'park_thought' | 'stuck';

/** Something a system surface asked for that only a screen can do. */
export type SurfaceRequest =
  /** Open the composer; `listening` starts it on the microphone (the brain dump). */
  | {
      readonly kind: 'composer';
      readonly listening: boolean;
      /** Words to send as if they had been typed: a step the camera found. */
      readonly text?: string;
    }
  /** Open the session's park-a-thought field. */
  | { readonly kind: 'park_thought' };

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
  | { readonly kind: 'offered'; readonly reveal: Reveal | null }
  | { readonly kind: 'picked_for_me'; readonly itemId: Id }
  | { readonly kind: 'hatching'; readonly shrunk: boolean };

const PICK_EVENTS = [
  'one_thing_picked',
  'deadline_answered',
  'drawer_item_swapped_in',
  'pick_for_me',
  'pick_dropped',
  'too_big',
  'monster_met',
  'task_set_aside',
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
  /** The words of a task call the person cancelled, on their way back to the composer. */
  readonly returnedText: string | null;
  /** The server would not take the text: the person is asked to say it another way. */
  /** `failed`: the last thing asked of the app went wrong; it says so in one plain line. */
  readonly notice: 'say_it_another_way' | 'failed' | null;
  /** The last task call failed with a connection up: Scootch says so and the pick is the person's. */
  readonly modelDown: boolean;
  /** When the reminder asked for on today's serious task goes off; `null` when none was asked. */
  readonly reminderAt: Instant | null;
  /** The task carried on to tomorrow, while today rests; `null` when none is. */
  readonly waitingForTomorrow: TaskRow | null;
  /** Dates heard in the last ramble, each with the line that says it out loud. */
  readonly heardDeadlines: readonly HeardDeadline[];
  readonly line: ShownLine | null;
  readonly burst: 'start' | 'confetti' | null;
  readonly treat: string | null;
  /** Thoughts handed over at the end of a session, waiting for keep or discard. */
  readonly parkedThoughts: readonly ParkedThought[];
  /** The task's own lines for the treat and the parked thoughts, kept past its finish. */
  readonly afterLines: AfterLines;
  readonly drawer: { readonly open: boolean; readonly items: readonly DrawerItemRow[] };
  /**
   * A serious task is part of today (finished, set aside or open) or waits in the drawer, or the
   * care screen was closed and nothing has been typed since.
   */
  readonly heavyToday: boolean;
  readonly settings: SettingsRow;
  /** Set by a system surface and cleared by the screen that acts on it. Absent means none. */
  readonly surfaceRequest?: SurfaceRequest | null;
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
  /** Bounds how long the person waits for the model before the day starts without it. */
  readonly timers: Timers;
  /** Told of every failure inside the store, for the crash reporter. */
  readonly onFailure?: (error: unknown) => void;
  /** Called once a finish has been written, so the backup can follow it. */
  readonly onFinished?: () => void;
  /**
   * Where the pages of things that arrived from the website are kept across a relaunch. Without
   * it, a page is known only for as long as its first task call is being waited for.
   */
  readonly arrivedPages?: ArrivedPages;
}

/** The text a task call is being made for, kept in memory only until its one thing is picked. */
export interface Offer {
  readonly text: string;
  readonly source: 'ramble' | 'typed';
  readonly energy: Energy | 'guess';
  readonly transcriptId: Id | null;
  /** The monster's page the text arrived from, when it came from the website. */
  readonly monsterPage?: string;
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
  /** A task whose last screen came from a judge the app does not trust: it is screened again. */
  untrustedTaskId: Id | null;
  /** When a task waiting for a trusted screen was last asked about. */
  screenAskedAt: Instant | null;
  /** Ends the wait for the task call under way at once; `null` when none is. */
  stopWaiting: (() => void) | null;
  /** A waiting task is being asked about right now, so it is not asked about twice. */
  askingPending: boolean;
  /** Words a cancel handed back to the composer that arrived from a monster's page, and the page. */
  handedBack: { readonly text: string; readonly monsterPage: string } | null;
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

/** What still reaches the store on a crisis day: settings, and the app coming and going. */
export const PASSIVE_EVENTS: readonly DayEvent['type'][] = [
  'settings_changed',
  'storage_replaced',
  'connection_returned',
  'returned_text_taken',
  'day_turned',
  'app_foregrounded',
  'app_backgrounded',
  'session_closed',
];
