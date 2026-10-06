import type { CardData, Language, ScreenVerdict } from '@scootch/domain';

import type { HttpClient } from './http-client';

/** Every public word is screened by a model before the page is kept, so the call may take a while. */
export const SHARE_TIMEOUT_MS = 15_000;

/** The header a phone proves a shared page is its own with. */
const UNSHARE_TOKEN_HEADER = 'X-Unshare-Token';

/**
 * What a card's or a story's page is made from. There is no field for a name, an account or a
 * task id; `card.taskLine` is the only place the task's words can travel, and it is `null` unless
 * the page shows them.
 */
export interface CardShareRequest {
  readonly kind: 'card' | 'story';
  readonly language: Language;
  readonly card: CardData;
  /** The care verdict stored for the task. The server shares nothing that is not `pass`. */
  readonly screen: ScreenVerdict;
}

export interface SharedPage {
  readonly id: string;
  /** The only way to take the page down. Kept on the phone, never sent anywhere but back. */
  readonly unshareToken: string;
}

/** The website's pages of things shared from the app. */
export interface ShareApi {
  shareCard(request: CardShareRequest): Promise<SharedPage>;
  unshareCard(id: string, unshareToken: string): Promise<void>;
  /** Tells a shared monster's page that its monster was caught. */
  monsterCaught(id: string, unshareToken: string, catchMinutes: number): Promise<void>;
}

function sharedPage(json: unknown): SharedPage {
  const { id, unshareToken } = (json ?? {}) as Record<string, unknown>;
  if (typeof id !== 'string' || id === '') throw new Error('no page id');
  if (typeof unshareToken !== 'string' || unshareToken === '') throw new Error('no token');
  return { id, unshareToken };
}

const done = () => undefined;

export function createShareApi(http: HttpClient): ShareApi {
  return {
    shareCard: (request) =>
      http.post('/v1/card-share', request, sharedPage, { timeoutMs: SHARE_TIMEOUT_MS }),
    unshareCard: (id, unshareToken) =>
      http.request('DELETE', `/v1/card-share/${encodeURIComponent(id)}`, null, done, {
        headers: { [UNSHARE_TOKEN_HEADER]: unshareToken },
      }),
    monsterCaught: (id, unshareToken, catchMinutes) =>
      http.request(
        'POST',
        `/v1/monster-page/${encodeURIComponent(id)}/caught`,
        { catchMinutes },
        done,
        { headers: { [UNSHARE_TOKEN_HEADER]: unshareToken } },
      ),
  };
}
