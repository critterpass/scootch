import type {
  DayNotification,
  Energy,
  HeardDeadline,
  HeardTime,
  MonsterCopy,
  OneThing,
  ParkedItem,
  SeriousLinePack,
  SessionLinePack,
  TaskCreateRequest,
  TaskLabels,
} from '@scootch/domain';

import type { ScootchApi } from './scootch-api';

/** What arrives first: the care verdict and the one thing. Enough to show the screen. */
export type TaskFirstStage =
  | { readonly verdict: 'crisis' }
  | { readonly verdict: 'reject' }
  /** The text only asked Scootch to choose: nothing was made from it. */
  | { readonly verdict: 'choose' }
  | {
      readonly verdict: 'pass' | 'serious';
      readonly seriousOverridden: boolean;
      readonly energy: Energy;
      readonly oneThing: OneThing;
      readonly parked: readonly ParkedItem[];
      readonly deadlines: readonly HeardDeadline[];
      /** A clock time the words gave for today ("dentist at 3"), worked out from the phone's clock. */
      readonly heardTime?: HeardTime;
      /** Known at once from the staged call, so a monster can be drawn before it has a name. */
      readonly labels?: TaskLabels;
      /**
       * False when the answer says the trusted judge did not screen the text (the fallback model
       * did, or nothing answered in time). Absent when the answer does not say.
       */
      readonly trusted?: boolean;
    };

/** The monster's words and its hatch line, which can arrive ahead of the rest. */
export interface TaskName {
  readonly monster: MonsterCopy;
  readonly hatch: string;
}

/**
 * Whether the judge an answer names is the trusted one: Jev, or the app's own first-run texts.
 * An answer that names none says nothing.
 */
export function trustedJudge(answeredBy: string | undefined): { readonly trusted?: boolean } {
  return answeredBy === undefined
    ? {}
    : { trusted: answeredBy === 'jev' || answeredBy === 'builtin' };
}

/** What follows: the monster's words and the lines of the session. */
export type TaskRest =
  | {
      readonly verdict: 'pass';
      /** `null` when the server sent no name: the store gives the monster a plain one. */
      readonly monster: MonsterCopy | null;
      readonly labels: TaskLabels;
      /** `null` when the server sent no lines: the offline pack speaks instead. */
      readonly lines: SessionLinePack | null;
      readonly notifications: readonly DayNotification[];
    }
  | { readonly verdict: 'serious'; readonly lines: SeriousLinePack };

export interface TaskCall {
  readonly first: TaskFirstStage;
  /** The name ahead of the rest, where the server sends it first. `null` when it does not. */
  readonly name?: Promise<TaskName | null>;
  /** `null` for a crisis or a rejected text, which have nothing more to come. Rejects if the rest never arrives. */
  readonly rest: Promise<TaskRest | null>;
}

/**
 * The task call as the app sees it: what arrives first, and a promise of the rest. How many
 * requests the server needs for one task is known only to the clients behind this interface.
 */
export interface TaskClient {
  createTask(input: TaskCreateRequest, options?: TaskCallOptions): Promise<TaskCall>;
}

export interface TaskCallOptions {
  /** The treat named for after the session, read when the line pack is asked for. */
  readonly treat?: () => string | null;
}

/** The single call: one request, split into the two stages here. Kept beside the staged client. */
export function createTaskClient(api: Pick<ScootchApi, 'screenInput' | 'taskCreate'>): TaskClient {
  return {
    async createTask(input) {
      const answer = await api.taskCreate(input);
      if (
        answer.verdict === 'crisis' ||
        answer.verdict === 'reject' ||
        answer.verdict === 'choose'
      ) {
        return { first: { verdict: answer.verdict }, rest: Promise.resolve(null) };
      }
      const first: TaskFirstStage = {
        verdict: answer.verdict,
        seriousOverridden: answer.verdict === 'pass' && answer.seriousOverridden,
        energy: answer.energy,
        oneThing: answer.oneThing,
        parked: answer.parked,
        deadlines: answer.deadlines,
        ...(answer.heardTime === undefined ? {} : { heardTime: answer.heardTime }),
        ...trustedJudge(answer.answeredBy),
      };
      // A pass the trusted judge did not give brings nothing funny with it.
      if (first.verdict === 'pass' && first.trusted === false) {
        return { first, rest: Promise.resolve(null) };
      }
      const rest: TaskRest =
        answer.verdict === 'pass'
          ? {
              verdict: 'pass',
              monster: answer.monster,
              labels: answer.labels,
              lines: answer.lines,
              notifications: answer.notifications,
            }
          : { verdict: 'serious', lines: answer.lines };
      return { first, rest: Promise.resolve(rest) };
    },
  };
}
