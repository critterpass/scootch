import { SHARED_KEYS, type SharedStore } from './surface-ports';

/** What a control, the Action button or a Live Activity button asked for while the app was away. */
export const SURFACE_ACTIONS = ['start_session', 'brain_dump', 'park_thought', 'stuck'] as const;
export type SurfaceAction = (typeof SURFACE_ACTIONS)[number];

export interface PendingAction {
  readonly id: string;
  readonly kind: SurfaceAction;
  /** When it was asked for, in milliseconds since 1970. */
  readonly at: number;
}

/** An action older than this was asked for in another moment, and is dropped. */
export const PENDING_ACTION_MAX_AGE_MS = 30 * 60_000;

function parse(stored: string | null): PendingAction[] {
  if (stored === null) return [];
  let list: unknown;
  try {
    list = JSON.parse(stored);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  const actions: PendingAction[] = [];
  for (const one of list as unknown[]) {
    if (typeof one !== 'object' || one === null) continue;
    const { id, kind, at } = one as Record<string, unknown>;
    if (typeof id !== 'string' || typeof at !== 'number') continue;
    const known = SURFACE_ACTIONS.find((action) => action === kind);
    if (known) actions.push({ id, kind: known, at });
  }
  return actions;
}

/**
 * Takes what the Swift intents recorded (`targets/_shared/PendingSurfaceActions.swift`) and hands
 * each action over exactly once: the stored list is removed before anything is dispatched, and an
 * id seen before in this run of the app is skipped, so a list written twice is still acted on once.
 */
export function createPendingActions(store: SharedStore, now: () => number) {
  const seen = new Set<string>();
  return {
    take(): PendingAction[] {
      let stored: string | null;
      try {
        stored = store.get(SHARED_KEYS.pendingActions);
        if (stored !== null) store.remove(SHARED_KEYS.pendingActions);
      } catch {
        return [];
      }
      const fresh: PendingAction[] = [];
      for (const action of parse(stored).sort((a, b) => a.at - b.at)) {
        if (seen.has(action.id)) continue;
        seen.add(action.id);
        if (now() - action.at <= PENDING_ACTION_MAX_AGE_MS) fresh.push(action);
      }
      return fresh;
    },
  };
}
