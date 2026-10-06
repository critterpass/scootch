import type {
  DayNotification,
  Energy,
  HeardDeadline,
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
  | {
      readonly verdict: 'pass' | 'serious';
      readonly seriousOverridden: boolean;
      readonly energy: Energy;
      readonly oneThing: OneThing;
      readonly parked: readonly ParkedItem[];
      readonly deadlines: readonly HeardDeadline[];
      /** Known at once from the staged call, so a monster can be drawn before it has a name. */
      readonly labels?: TaskLabels;
    };

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
  /** `null` for a crisis or a rejected text, which have nothing more to come. Rejects if the rest never arrives. */
  readonly rest: Promise<TaskRest | null>;
}

/**
 * The task call as the app sees it: what arrives first, and a promise of the rest. How many
 * requests the server needs for one task is known only to the clients behind this interface.
 */
export interface TaskClient {
  createTask(input: TaskCreateRequest): Promise<TaskCall>;
}

/** The single call: one request, split into the two stages here. Kept beside the staged client. */
export function createTaskClient(api: Pick<ScootchApi, 'screenInput' | 'taskCreate'>): TaskClient {
  return {
    async createTask(input) {
      const answer = await api.taskCreate(input);
      if (answer.verdict === 'crisis' || answer.verdict === 'reject') {
        return { first: { verdict: answer.verdict }, rest: Promise.resolve(null) };
      }
      const first: TaskFirstStage = {
        verdict: answer.verdict,
        seriousOverridden: answer.verdict === 'pass' && answer.seriousOverridden,
        energy: answer.energy,
        oneThing: answer.oneThing,
        parked: answer.parked,
        deadlines: answer.deadlines,
      };
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
