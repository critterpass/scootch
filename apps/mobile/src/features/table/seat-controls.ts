import type { ReportReason, TogetherApi } from '../../api/together-api';

import type { TableStore } from './table-store';

type Api = Pick<TogetherApi, 'mute' | 'block' | 'report'>;

/**
 * What the seat sheet does. Each is a route of the person's own: nothing is put on the table's
 * socket about the other person, so the table has nothing to show them.
 */
export function seatControls(api: Api, table: Pick<TableStore, 'leave' | 'getState'>) {
  return {
    mute: (accountId: string, muted: boolean) => api.mute(accountId, muted),
    /** The server takes the reporter's seat away when asked to; the phone then lets go of it. */
    async report(accountId: string, reason: ReportReason, alsoLeave: boolean): Promise<void> {
      const { tableId } = table.getState();
      if (tableId === null) return;
      await api.report({ tableId, accountId, reason, alsoLeave });
      if (alsoLeave) table.leave();
    },
    /** Blocking ends sharing this table: the one who blocked is the one who leaves. */
    async block(accountId: string): Promise<void> {
      await api.block(accountId, true);
      table.leave();
    },
    leave: () => table.leave(),
  };
}
