import { z } from 'zod';

export const appleKeysUrl = 'https://appleid.apple.com/auth/keys';

/** Apple rotates its keys rarely; a kept set is trusted this long. */
const keepForMs = 60 * 60 * 1000;
/** An unknown key id refetches the set, but no more often than this. */
const refetchAfterMs = 60 * 1000;
const fetchTimeoutMs = 5_000;

const keySetSchema = z.object({
  keys: z.array(
    z.object({
      kty: z.literal('RSA'),
      kid: z.string().min(1),
      n: z.string().min(1),
      e: z.string().min(1),
    }),
  ),
});
export type AppleKey = z.infer<typeof keySetSchema>['keys'][number];

export class AppleKeysUnavailable extends Error {
  constructor() {
    super('Apple’s keys could not be read');
    this.name = 'AppleKeysUnavailable';
  }
}

export type AppleKeySource = {
  /** The published key with this id, or undefined when Apple publishes none. */
  find(kid: string, now: number): Promise<AppleKey | undefined>;
};

/**
 * Apple's published signing keys, fetched once and kept. A key id that is not in the kept set
 * triggers one refetch (Apple may have rotated), so a stream of made-up key ids cannot turn
 * every request into a call to Apple.
 */
export function createAppleKeySource(send: typeof fetch = fetch): AppleKeySource {
  let kept: { keys: readonly AppleKey[]; at: number } | undefined;

  async function load(now: number): Promise<readonly AppleKey[]> {
    let json: unknown;
    try {
      const response = await send(appleKeysUrl, { signal: AbortSignal.timeout(fetchTimeoutMs) });
      if (!response.ok) throw new AppleKeysUnavailable();
      json = await response.json();
    } catch {
      throw new AppleKeysUnavailable();
    }
    const parsed = keySetSchema.safeParse(json);
    if (!parsed.success) throw new AppleKeysUnavailable();
    kept = { keys: parsed.data.keys, at: now };
    return kept.keys;
  }

  return {
    async find(kid, now) {
      const fresh = kept !== undefined && now - kept.at < keepForMs;
      const keys = fresh && kept ? kept.keys : await load(now);
      const known = keys.find((key) => key.kid === kid);
      if (known !== undefined || kept === undefined || now - kept.at < refetchAfterMs) return known;
      return (await load(now)).find((key) => key.kid === kid);
    },
  };
}

/** The Worker's own key source: one per isolate, on the real network. */
export const appleKeys = createAppleKeySource((input, init) => fetch(input, init));
