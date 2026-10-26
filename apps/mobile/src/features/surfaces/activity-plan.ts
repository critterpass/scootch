import { DAY_MS, dayStartOf, type Instant } from '@phusclass/domain/board';

import type {
  SessionActivityAttributes,
  SessionActivityState,
} from '../../../modules/phusclass-live-activity';
import { nextLiveLineTurn } from '../../effects/live-line-turns';
import type { BoardSnapshot } from '../../state/board-view';

import { fuseOfTask, pressureRises } from './surface-snapshot';

/**
 * What the Live Activity should be showing, from the board. `null` is no activity: an empty desk,
 * a finish, recess, the crisis screen, or a serious task waiting (the classroom goes quiet).
 */
export type ActivityPlan = {
  /** The same identity keeps one activity and updates it; a new one replaces it. */
  readonly identity: string;
  readonly attributes: SessionActivityAttributes;
  readonly state: SessionActivityState;
  /** When the system should draw it again by itself: the next pressure rise or line turn. */
  readonly staleDate: Instant | null;
};

/**
 * On the desk: the task, his face at the pressure, and the fuse. During a period: the time left,
 * his pacing and the line the session screen is saying (`line`).
 */
export function activityPlanOf(board: BoardSnapshot, line: string): ActivityPlan | null {
  const desk = board.desk;
  if (desk === null) return null;
  const now = board.now.at;
  const attributes = { taskTitle: desk.task.text, taskId: desk.task.id };

  if (board.phase === 'running' || board.phase === 'time up') {
    const session = board.session;
    if (session === null) return null;
    return {
      identity: `session:${session.id}`,
      attributes,
      state: {
        mode: 'session',
        endDate: session.endsAt,
        startDate: session.startedAt,
        line,
        heavy: desk.heavy,
      },
      staleDate: nextLiveLineTurn(now, session.endsAt),
    };
  }

  if (board.phase !== 'waiting' || desk.heavy) return null;
  const rises = pressureRises(desk.task, board.now, desk.pressure);
  const fuse = fuseOfTask(desk.task, desk.fuse !== null);
  const upcoming = [...rises, ...(fuse !== null && fuse.end > now ? [fuse.end] : [])].sort(
    (a, b) => a - b,
  );
  return {
    identity: `desk:${desk.task.id}`,
    attributes,
    state: {
      mode: 'desk',
      endDate: dayStartOf(board.now) + DAY_MS,
      line: '',
      pressure: desk.pressure,
      pressureAt: rises,
      fuseStart: fuse?.start ?? null,
      fuseEnd: fuse?.end ?? null,
      heavy: false,
    },
    staleDate: upcoming[0] ?? null,
  };
}
