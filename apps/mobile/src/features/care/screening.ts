import type { Language, ScreenInputResponse } from '@phusclass/domain';
import type { CareFlag, Task } from '@phusclass/domain/board';

import type { ScreenClient } from '../../api/screen-client';
import type { BoardStore } from '../../state/board-store';

import type { CareActions } from './care-actions';
import type { PlainCompany } from './care-mode';

/** What a screen answer does to a task. */
export type ScreenOutcome =
  /** Keep this care on the task: it has been screened. */
  | { readonly kind: 'screened'; readonly care: CareFlag }
  /** A crisis: flag it and open the crisis screen. */
  | { readonly kind: 'crisis' }
  /** Nobody trusted judged it. It stays plain and is asked again later. */
  | { readonly kind: 'ask again' };

/**
 * The care a screen answer gives a task. Only Jev can clear a text; any model can add caution.
 * A crisis from anyone is a crisis. "It's fine, be funny" lifts only a serious verdict.
 */
export function screenOutcomeOf(
  answer: ScreenInputResponse,
  options: { readonly beFunny: boolean },
): ScreenOutcome {
  if (answer.verdict === 'crisis') return { kind: 'crisis' };
  if (answer.reason === 'unscreened') return { kind: 'ask again' };
  switch (answer.verdict) {
    case 'pass':
      return answer.answeredBy === 'jev'
        ? { kind: 'screened', care: 'none' }
        : { kind: 'ask again' };
    case 'serious':
      return {
        kind: 'screened',
        care: options.beFunny && answer.answeredBy === 'jev' ? 'none' : 'serious',
      };
    case 'reject':
      // Abuse or an injection: no act on it, ever.
      return { kind: 'screened', care: 'serious' };
  }
}

/**
 * Tasks that still need the screen: open, not yet screened, and not a crisis the phone's gate
 * already caught (that text goes nowhere).
 */
export function tasksToScreen(tasks: readonly Task[]): Task[] {
  return tasks.filter(
    (task) =>
      (task.status === 'board' || task.status === 'desk') &&
      !task.screened &&
      task.care !== 'crisis',
  );
}

/** A task the server would not judge is not asked about again for this long. */
export const ASK_AGAIN_MS = 2 * 60 * 1000;

export interface ScreeningDeps {
  readonly store: BoardStore;
  readonly client: ScreenClient;
  readonly care: CareActions;
  readonly language: () => Language;
  readonly online: () => Promise<boolean>;
  readonly beFunny: () => Promise<boolean>;
  readonly plainCompany: () => PlainCompany | null;
  readonly now?: () => number;
}

/**
 * Sends each unscreened task to the server's screen, one at a time, and keeps its verdict on the
 * task. Without a connection nothing is sent and every task stays plain; `run` is called again
 * when the connection returns, at launch and whenever something new is said.
 */
export function createScreening(deps: ScreeningDeps) {
  const clock = deps.now ?? Date.now;
  const askedAt = new Map<string, number>();
  let running: Promise<void> | null = null;
  let again = false;

  async function screenOne(task: Task): Promise<'next' | 'stop'> {
    let answer: ScreenInputResponse;
    try {
      answer = await deps.client.screenInput({
        language: deps.language(),
        text: task.text.slice(0, 4000),
        source: 'typed',
      });
    } catch {
      // Offline, slow or failing: the task stays plain until the next try.
      return 'stop';
    }
    askedAt.set(task.id, clock());
    const outcome = screenOutcomeOf(answer, { beFunny: await deps.beFunny() });
    if (outcome.kind === 'crisis') {
      await deps.care.raiseCrisis(task.id);
      return 'stop';
    }
    if (outcome.kind === 'ask again') return 'next';
    await deps.store.screened(task.id, outcome.care);
    const plain = deps.plainCompany();
    if (outcome.care === 'none' && plain !== null && task.createdAt >= plain.since) {
      await deps.care.endPlainCompany();
    }
    return 'next';
  }

  async function pass(): Promise<void> {
    if (!(await deps.online())) return;
    const board = deps.store.getSnapshot();
    if (board.phase === 'crisis') return;
    const now = clock();
    const due = tasksToScreen(board.board.map((ranked) => ranked.task)).filter(
      (task) => now - (askedAt.get(task.id) ?? -Infinity) >= ASK_AGAIN_MS,
    );
    for (const task of due) {
      if ((await screenOne(task)) === 'stop') return;
    }
  }

  return {
    /** Screens what is waiting. A call made while a pass runs gets one more pass after it. */
    run(): Promise<void> {
      if (running !== null) {
        again = true;
        return running;
      }
      const loop = async () => {
        do {
          again = false;
          await pass();
        } while (again);
      };
      running = loop().finally(() => {
        running = null;
      });
      return running;
    },
  };
}
