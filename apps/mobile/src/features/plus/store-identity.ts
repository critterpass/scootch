import { plusCustomerResponseSchema } from '@phusclass/domain';

import type { HttpClient } from '../../api/http-client';
import type { PlusMemory } from '../../data/plus-memory';

const CUSTOMER_PATH = '/v1/plus/customer';

/** How long a purchase or a restore waits for the id before it goes ahead without one. */
const PATIENCE_MS = 3_000;

/** Asks the server for this installation's id at the store. Rejects when it cannot be reached. */
export function askStoreCustomerId(http: Pick<HttpClient, 'request'>): Promise<string> {
  return http.request(
    'GET',
    CUSTOMER_PATH,
    null,
    (json) => plusCustomerResponseSchema.parse(json).appUserId,
  );
}

/** The id the store was last logged in with on this phone, as stored; anything else is none. */
function storedId(value: unknown): string | null {
  const parsed = plusCustomerResponseSchema.shape.appUserId.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export interface StoreIdentityDeps {
  readonly memory: Pick<PlusMemory, 'read' | 'write'>;
  /** The server's id for this installation. Rejects with no connection or a failing route. */
  readonly customerId: () => Promise<string>;
  /** Sets the store up, under the given id or anonymously. Throws when it cannot be set up. */
  readonly configure: (appUserId: string | null) => void;
  /** Logs the store in. From an anonymous user this carries what was bought over to the id. */
  readonly logIn: (appUserId: string) => Promise<void>;
  readonly patienceMs?: number;
}

export interface StoreIdentity {
  /**
   * Sets the store up under the id this phone last logged in with, or anonymously when there is
   * none, then checks the id with the server without waiting for it. Called once at launch;
   * rejects only when the store cannot be set up.
   */
  readonly start: () => Promise<void>;
  /**
   * Resolves once the store carries the server's id, or once waiting longer would hold up a
   * purchase or restore, which then goes ahead anonymously. Never rejects.
   */
  readonly beforeBuying: () => Promise<void>;
}

/**
 * Who this phone is at the store. The server records Plus from the store's own events, and can
 * only tie them to this phone when the store knows the phone by the id the server handed out.
 * A phone that cannot reach the server buys anonymously and logs in at the next try, so neither
 * buying nor restoring ever waits on the server for long.
 */
export function storeIdentity(deps: StoreIdentityDeps): StoreIdentity {
  /** The id the store is logged in with, once known. */
  let known: string | null = null;
  /** The server has confirmed the id since launch. */
  let confirmed = false;
  let linking: Promise<void> | null = null;

  const confirm = async () => {
    const id = await deps.customerId();
    if (id !== known) {
      await deps.logIn(id);
      known = id;
      await deps.memory.write('storeCustomerId', id).catch(() => undefined);
    }
    confirmed = true;
  };
  /** One attempt at a time; a failed one is tried again by the next caller. */
  const link = (): Promise<void> => {
    if (confirmed) return Promise.resolve();
    linking ??= confirm()
      .catch(() => undefined)
      .finally(() => {
        linking = null;
      });
    return linking;
  };

  return {
    start: async () => {
      const cached = storedId(await deps.memory.read('storeCustomerId').catch(() => null));
      deps.configure(cached);
      known = cached;
      void link();
    },
    beforeBuying: async () => {
      if (known !== null) return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const patience = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, deps.patienceMs ?? PATIENCE_MS);
      });
      await Promise.race([link(), patience]);
      clearTimeout(timer);
    },
  };
}
