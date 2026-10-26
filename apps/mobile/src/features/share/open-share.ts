import type { useRouter } from 'expo-router';

/**
 * Opens the share sheet for one logbook entry (a finished task's id). Other screens call this and
 * nothing else: the sheet itself checks whether the finish may be shared, so a serious task or a
 * crisis day shows no card whoever opens it. A screen that should not offer sharing at all reads
 * `shareGuard` first and shows no way in.
 */
export function openShare(
  router: Pick<ReturnType<typeof useRouter>, 'push'>,
  logEntryId: string,
): void {
  router.push({ pathname: '/share/[id]', params: { id: logEntryId } });
}
