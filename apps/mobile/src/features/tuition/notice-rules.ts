import type { BoardSnapshot } from '../../state/board-view';

/**
 * Whether the tuition notice is up on the chalkboard. The board's rule pins it (after the third
 * finish, at a recess, never on a heavy day, never for someone enrolled); once pinned it stays up
 * for the rest of that recess and is gone with it. Pinning is recorded at once, so a notice left
 * alone rests for two weeks.
 */
export function noticeUp(
  snapshot: Pick<BoardSnapshot, 'recess'>,
  pinnedFor: number | null,
): boolean {
  return snapshot.recess !== null && pinnedFor === snapshot.recess.endsAt;
}

/** The routes a paid thing may be offered from: the pinned notice and the quiet locks. */
export const OFFERED_FROM = ['tuition-notice.tsx', 'locked-panel.tsx'] as const;
