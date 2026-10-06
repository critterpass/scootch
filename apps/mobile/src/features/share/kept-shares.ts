import type { Language } from '@scootch/i18n';

/**
 * One page this phone put on the website, and the token that takes it down. The key says which
 * card, story or monster it is; nothing of the task is kept here.
 */
export interface KeptShare {
  readonly key: string;
  readonly id: string;
  readonly unshareToken: string;
  readonly language: Language;
  /** Whether the page shows the task's words. */
  readonly taskShown: boolean;
  /** For a monster's own page: whether the server has been told of its catch. */
  readonly caughtTold?: boolean;
}

/** Where the kept pages live. The app keeps them in the keychain; tests use a list in memory. */
export interface KeptShares {
  read(): Promise<readonly KeptShare[]>;
  write(shares: readonly KeptShare[]): Promise<void>;
}

/** The newest pages kept; older ones stay up on the website but can no longer be taken down. */
export const KEPT_SHARES_LIMIT = 200;

export const cardShareKey = (kind: 'card' | 'story', seed: string, number: number) =>
  `${kind}:${seed}:${number}`;
export const monsterPageKey = (seed: string) => `monster:${seed}`;

export function withShare(shares: readonly KeptShare[], share: KeptShare): readonly KeptShare[] {
  return [...shares.filter((one) => one.key !== share.key), share].slice(-KEPT_SHARES_LIMIT);
}

export function withoutShare(shares: readonly KeptShare[], key: string): readonly KeptShare[] {
  return shares.filter((one) => one.key !== key);
}

export function memoryKeptShares(initial: readonly KeptShare[] = []): KeptShares {
  let shares = initial;
  return {
    read: () => Promise.resolve(shares),
    write: (next) => {
      shares = next;
      return Promise.resolve();
    },
  };
}
