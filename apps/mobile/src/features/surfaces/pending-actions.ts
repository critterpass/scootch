import type { Instant } from '@phusclass/domain/board';

/**
 * What Siri, Shortcuts, a widget or the Live Activity asked the app to do, as the intents write it
 * to the App Group (`targets/_shared/PendingSurfaceActions.swift`).
 */
export type PendingAction =
  | { readonly id: string; readonly kind: 'add'; readonly text: string; readonly at: Instant }
  | {
      readonly id: string;
      readonly kind: 'start' | 'done';
      readonly taskId: string | null;
      readonly at: Instant;
    };

/** A start or a Done older than this is not acted on: the moment for it has passed. */
export const PRESS_KEEPS_MS = 30 * 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** The list as the intents wrote it. Anything it cannot read is left out; words never are. */
export function readPendingActions(json: string | null): PendingAction[] {
  if (json === null || json === '') return [];
  let list: unknown;
  try {
    list = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  const actions: PendingAction[] = [];
  for (const entry of list) {
    if (!isRecord(entry) || typeof entry['id'] !== 'string') continue;
    const at = typeof entry['at'] === 'number' ? entry['at'] : 0;
    const taskId = typeof entry['taskId'] === 'string' ? entry['taskId'] : null;
    const kind = entry['kind'];
    if (kind === 'add' && typeof entry['text'] === 'string' && entry['text'].trim() !== '') {
      actions.push({ id: entry['id'], kind, text: entry['text'], at });
    } else if (kind === 'start' || kind === 'done') {
      actions.push({ id: entry['id'], kind, taskId, at });
    }
  }
  return actions.sort((a, b) => a.at - b.at);
}

/** A press of Start or Done. */
export type PendingPress = Extract<PendingAction, { readonly kind: 'start' | 'done' }>;

/** What the app does about the list: every word said goes on the board; one press, the latest. */
export function planPendingActions(
  actions: readonly PendingAction[],
  now: Instant,
): { readonly add: readonly string[]; readonly press: PendingPress | null } {
  const add = actions.flatMap((action) => (action.kind === 'add' ? [action.text] : []));
  const presses = actions.filter(
    (action): action is PendingPress => action.kind !== 'add' && now - action.at <= PRESS_KEEPS_MS,
  );
  return { add, press: presses.at(-1) ?? null };
}
