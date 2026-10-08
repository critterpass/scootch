import { SHARED_KEYS, type SharedStore } from './surface-ports';

/** A thing shared into Scootch from another app (`targets/_shared/SharedIn.swift`). */
export interface SharedThing {
  readonly id: string;
  /** The words the share sheet took: typed text, a link with its title, or a picture's lines. */
  readonly text: string;
  /** "Hunt it now", or "Let it lurk till tomorrow". */
  readonly when: 'now' | 'tomorrow';
  /** When it was shared, in milliseconds since 1970. */
  readonly at: number;
}

function parse(stored: string | null): SharedThing[] {
  if (stored === null) return [];
  let list: unknown;
  try {
    list = JSON.parse(stored);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  const things: SharedThing[] = [];
  for (const one of list as unknown[]) {
    if (typeof one !== 'object' || one === null) continue;
    const { id, text, when, at } = one as Record<string, unknown>;
    if (typeof id !== 'string' || typeof text !== 'string' || typeof at !== 'number') continue;
    if (text.trim() === '' || (when !== 'now' && when !== 'tomorrow')) continue;
    things.push({ id, text, when, at });
  }
  return things;
}

/**
 * Takes what the share sheet kept and hands each thing over exactly once, oldest first: the
 * stored list is removed before anything is done with it, and an id seen before in this run of
 * the app is skipped. A shared thing is the person's own, so none is dropped for its age.
 */
export function createSharedIn(store: SharedStore) {
  const seen = new Set<string>();
  return {
    take(): SharedThing[] {
      let stored: string | null;
      try {
        stored = store.get(SHARED_KEYS.sharedIn);
        if (stored !== null) store.remove(SHARED_KEYS.sharedIn);
      } catch {
        return [];
      }
      const fresh: SharedThing[] = [];
      for (const thing of parse(stored).sort((a, b) => a.at - b.at)) {
        if (seen.has(thing.id)) continue;
        seen.add(thing.id);
        fresh.push(thing);
      }
      return fresh;
    },
  };
}
