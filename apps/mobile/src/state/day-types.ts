import type {
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
  | { readonly type: 'session_set'; readonly minutes: number; readonly treat?: string | null }
  | { readonly type: 'session'; readonly event: SessionEvent }
  | { readonly type: 'drawer'; readonly event: DrawerEvent }
  | {
      readonly type: 'thought_resolved';
      readonly thought: ParkedThought;
      readonly resolution: 'keep' | 'discard';
    }
  | { readonly type: 'done_for_today' }
  | { readonly type: 'settings_changed'; readonly changes: Partial<Omit<SettingsRow, 'id'>> }
  | { readonly type: 'connection_returned' }
  | { readonly type: 'app_foregrounded' }
  | { readonly type: 'app_backgrounded' };

export interface ShownLine {
  readonly slot: SessionLine | 'hatch';
  readonly text: string;
}

/** What the screens read. Everything but the transient parts is rebuilt from storage. */
export interface DayState {
  /** False until the store has rebuilt today from storage. */
  readonly ready: boolean;
  readonly localDate: IsoDate;
  readonly today: TodayState;
  readonly morning: MorningOffer;
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
}

/** The store's working memory between events. */
export interface DayMemory {
  state: DayState;
  offer: Offer | null;
  sessionRowId: Id | null;
  lastOpenedDay: IsoDate | null;
  workingTurn: number;
}

export interface DayContext {
  readonly deps: DayStoreDeps;
  readonly memory: DayMemory;
  /** Replaces part of the state and tells the subscribers. */
  set(changes: Partial<DayState>): void;
  /** Reads today back from storage, publishes it and brings the notifications in line. */
  refresh(): Promise<void>;
  now(): Instant;
}
