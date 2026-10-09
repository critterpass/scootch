import type { DayContext, SurfaceActionKind, SurfaceRequest } from './day-types';
import { applySession, currentTask, setSession } from './session-flow';

/** The session a control or the Action button starts when no length was kept with the thing. */
export const SURFACE_SESSION_MINUTES = 10;

const TIMED: readonly string[] = ['running', 'stuck', 'holding'];

function sessionRunning(ctx: DayContext): boolean {
  const { session } = ctx.memory.state;
  return session !== null && TIMED.includes(session.phase);
}

/**
 * What a system surface asked for, applied to today as it is now. Nothing here can do more than
 * the screens can: a crisis day ignores every action, a running session is never restarted, and
 * an action with nothing to act on is dropped without a word.
 */
export async function applySurfaceAction(
  ctx: DayContext,
  action: SurfaceActionKind,
): Promise<void> {
  const { today, session } = ctx.memory.state;
  if (today.kind === 'crisis') return;

  if (action === 'start_session') {
    if (today.kind === 'nothing_yet') {
      return ctx.set({ surfaceRequest: { kind: 'composer', listening: false } });
    }
    const startable =
      today.kind === 'task_set' || (today.kind === 'serious' && today.session === null);
    const task = currentTask(ctx);
    if (!startable || !task) return;
    // The length chosen on the wheel, when it was kept with a cue or a bite; ten minutes otherwise.
    const minutes = task.chosenMinutes ?? SURFACE_SESSION_MINUTES;
    if (session?.phase !== 'set') setSession(ctx, minutes, null);
    return applySession(ctx, { type: 'started' });
  }
  if (action === 'brain_dump') {
    if (today.kind === 'nothing_yet') {
      ctx.set({ surfaceRequest: { kind: 'composer', listening: true } });
    }
    return;
  }
  if (!sessionRunning(ctx)) return;
  if (action === 'stuck') return applySession(ctx, { type: 'stuck_tapped' });
  // Parking needs the thought's words, which only the session screen can take.
  ctx.set({ surfaceRequest: { kind: 'park_thought' } });
}

/**
 * Scootch was opened, or its Live Activity tapped, in the middle of a session: the task's own
 * "you picked me up" line is said. A serious task has no such line, so nothing is said.
 */
export function noticePickUp(ctx: DayContext): void {
  const task = currentTask(ctx);
  if (!task || !sessionRunning(ctx)) return;
  const { lines } = task;
  if (lines === null || !('pickedUp' in lines)) return;
  ctx.set({ line: { slot: 'working', text: lines.pickedUp } });
}

export type RequestOf<K extends SurfaceRequest['kind']> = Extract<
  SurfaceRequest,
  { readonly kind: K }
>;

/**
 * Hands a screen each request of its own kind once. A request is the object the store set: the
 * same one seen again (a second render, the screen coming back) is not handed over twice.
 */
export function createRequestTaker<K extends SurfaceRequest['kind']>(kind: K) {
  let last: SurfaceRequest | null = null;
  return (request: SurfaceRequest | null): RequestOf<K> | null => {
    if (request === null || request.kind !== kind || request === last) return null;
    last = request;
    return request as RequestOf<K>;
  };
}
