import type { PushToSend } from './push';

/**
 * The two pushes the server sends, written here and nowhere else: fixed lines with at most a
 * display name in them. A push never says what anyone is working on.
 */

/** A nudge for someone whose phone has no connection to the table. */
export function nudgePush(fromName: string, tableId: string): PushToSend {
  return {
    alert: {
      en: { title: 'Scootch', body: `${fromName} nudged you.` },
      vi: { title: 'Scootch', body: `${fromName} vừa khều bạn một cái.` },
    },
    data: { kind: 'nudge', tableId },
    collapseId: `nudge-${tableId}`,
    // A nudge is about now: not worth delivering once the session it belongs to is long over.
    expiresInSeconds: 10 * 60,
  };
}

/** The one gentle notification a haunt gets. `fromName` is null for one sent without a name. */
export function hauntPush(fromName: string | null, hauntId: string): PushToSend {
  return {
    alert: {
      en: {
        title: 'Scootch',
        body: fromName === null ? 'Someone sent you a monster.' : `${fromName} sent you a monster.`,
      },
      vi: {
        title: 'Scootch',
        body:
          fromName === null
            ? 'Có người gửi cho bạn một con quái.'
            : `${fromName} gửi cho bạn một con quái.`,
      },
    },
    data: { kind: 'haunt', hauntId },
    collapseId: `haunt-${hauntId}`,
    expiresInSeconds: 24 * 60 * 60,
  };
}
