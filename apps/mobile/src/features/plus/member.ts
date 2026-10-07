import type { Instant } from '@scootch/domain';

/** What the member card carries besides the plan: its number and when the person joined. */
export interface Member {
  /** Handed out by the server, once. `null` until it has answered. */
  readonly number: number | null;
  /** When Plus was first seen on this phone. `null` for someone who never held it. */
  readonly since: Instant | null;
}

export const NO_MEMBER: Member = { number: null, since: null };

/** A stored member, checked field by field. Anything unreadable counts as not stored. */
export function memberFromStored(value: unknown): Member {
  if (typeof value !== 'object' || value === null) return NO_MEMBER;
  const { number, since } = value as Record<string, unknown>;
  return {
    number: typeof number === 'number' && Number.isInteger(number) && number > 0 ? number : null,
    since: typeof since === 'number' && Number.isFinite(since) ? since : null,
  };
}
