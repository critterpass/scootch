import type { Id } from '@scootch/domain';

// Which finishes have had their reveal, for as long as the app stays open. A finish is revealed
// once; after a relaunch the session screens are over and the keepsakes are simply in their places.
const seen = new Set<Id>();

export function markRevealSeen(taskId: Id): void {
  seen.add(taskId);
}

export function revealSeen(taskId: Id): boolean {
  return seen.has(taskId);
}
