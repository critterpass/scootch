/** One place the anonymous backup token is kept. A store that is switched off throws. */
export interface BackupTokenStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  clear(): Promise<void>;
}

/** What the server accepts as a backup token. */
export const BACKUP_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

const URL_SAFE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Random bytes as URL-safe text with no padding: 32 bytes make 43 characters. */
export function tokenFromBytes(bytes: Uint8Array): string {
  let text = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    text += URL_SAFE[first >> 2];
    text += URL_SAFE[((first & 3) << 4) | ((second ?? 0) >> 4)];
    if (second !== undefined) text += URL_SAFE[((second & 15) << 2) | ((third ?? 0) >> 6)];
    if (third !== undefined) text += URL_SAFE[third & 63];
  }
  return text;
}

export interface BackupTokenDeps {
  /** The synchronisable Keychain item. */
  readonly keychain: BackupTokenStore;
  /** iCloud key-value storage. */
  readonly cloud: BackupTokenStore;
  readonly newToken: () => string;
}

export interface TokenReading {
  readonly token: string | null;
  /** Which stores could be read just now. One that threw did not answer. */
  readonly answered: { readonly keychain: boolean; readonly cloud: boolean };
}

export interface BackupTokens {
  /**
   * The token from whichever store answers. When one store holds it and the other does not, the
   * other is written so that both hold it again. Never makes a token.
   */
  read(): Promise<TokenReading>;
  /**
   * The stored token, or a new one written to both stores. `null` when no store would take it:
   * then there is nothing to back up under.
   */
  ensure(): Promise<string | null>;
  /** Removes the token from both stores. A store that is off is skipped. */
  clear(): Promise<void>;
  /**
   * True when neither store can be read. Scootch then tells the person that the world lives only
   * on this phone.
   */
  bothOff(): Promise<boolean>;
}

type Answer = { readonly ok: true; readonly token: string | null } | { readonly ok: false };

async function ask(store: BackupTokenStore): Promise<Answer> {
  try {
    const stored = await store.read();
    // Something that is not a token (a damaged or foreign value) counts as nothing stored.
    return {
      ok: true,
      token: stored !== null && BACKUP_TOKEN_PATTERN.test(stored) ? stored : null,
    };
  } catch {
    return { ok: false };
  }
}

async function tryWrite(store: BackupTokenStore, token: string): Promise<boolean> {
  try {
    await store.write(token);
    return true;
  } catch {
    return false;
  }
}

/**
 * The backup token, kept in two places because the person can switch either one off in iOS
 * Settings. The token is never logged.
 */
export function createBackupTokens(deps: BackupTokenDeps): BackupTokens {
  async function read(): Promise<TokenReading> {
    const [keychain, cloud] = await Promise.all([ask(deps.keychain), ask(deps.cloud)]);
    const fromKeychain = keychain.ok ? keychain.token : null;
    const fromCloud = cloud.ok ? cloud.token : null;
    // When the two disagree the Keychain wins, and iCloud is brought into line with it.
    const token = fromKeychain ?? fromCloud;
    if (token !== null) {
      if (fromKeychain !== token) await tryWrite(deps.keychain, token);
      if (fromCloud !== token) await tryWrite(deps.cloud, token);
    }
    return { token, answered: { keychain: keychain.ok, cloud: cloud.ok } };
  }

  return {
    read,
    async ensure() {
      const reading = await read();
      if (reading.token !== null) return reading.token;
      const token = deps.newToken();
      const written = await Promise.all([
        tryWrite(deps.keychain, token),
        tryWrite(deps.cloud, token),
      ]);
      return written.includes(true) ? token : null;
    },
    async clear() {
      await Promise.all([
        deps.keychain.clear().catch(() => undefined),
        deps.cloud.clear().catch(() => undefined),
      ]);
    },
    async bothOff() {
      const { answered } = await read();
      return !answered.keychain && !answered.cloud;
    },
  };
}
